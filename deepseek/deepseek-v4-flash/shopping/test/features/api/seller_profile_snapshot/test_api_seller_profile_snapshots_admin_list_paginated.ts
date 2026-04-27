import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can retrieve a paginated list of seller profile snapshots.
 *
 * Verifies that the administrator-facing seller profile snapshots listing endpoint returns correctly structured paginated results. The test creates an administrator and seller account, completes the seller approval workflow, and then queries seller profile snapshots with pagination parameters.
 *
 * Special attention is given to validating the pagination metadata structure and the snapshot summary fields returned in the response.
 */
export async function test_api_seller_profile_snapshots_admin_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Seller submits an approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves the seller's approval request
  const updatedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Administrator retrieves seller profile snapshots with default pagination
  const response =
    await api.functional.eCommerceMall.administrator.sellers.profile.snapshots.index(
      adminConnection,
      {
        sellerId: sellerAuthorized.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is valid", () => {
    const expectedPages =
      response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / response.pagination.limit);
    return response.pagination.pages === expectedPages;
  });
  // 7. Validate data array structure
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has UUID id", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has non-empty name",
      () => snapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot has description string",
      () => typeof snapshot.description === "string",
    );
    TestValidator.predicate(
      "snapshot has logo URI",
      () => typeof snapshot.logo === "string" && snapshot.logo.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at date-time",
      () => !isNaN(new Date(snapshot.created_at).getTime()),
    );
  }
  // 8. Validate ordering: snapshots should be ordered by created_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "snapshots ordered newest first",
      () =>
        new Date(response.data[i - 1].created_at).getTime() >=
        new Date(response.data[i].created_at).getTime(),
    );
  }
}