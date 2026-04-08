import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test viewing pending seller approval requests as an administrator.
 *
 * Validates the seller approvals listing functionality by filtering for pending approval requests and verifying the response structure, data integrity, and pagination metadata. Ensures that only sellers awaiting administrator approval are returned and that all required fields are present.
 *
 * Special attention is given to verifying that rejection_reason is null for pending sellers (since they haven't been rejected yet) and that the default sorting by created_at descending is applied correctly.
 *
 * 1. Register and authenticate as an administrator.
 * 2. Call the seller approvals endpoint with approval_status='pending' filter.
 * 3. Validate the response structure contains pagination metadata and seller summaries.
 * 4. Verify all returned sellers have approval_status='pending'.
 * 5. Verify rejection_reason is null for all pending sellers.
 * 6. Verify pagination metadata is correct and valid.
 */
export async function test_api_seller_approvals_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Request pending seller approvals
  const response =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          approval_status: "pending",
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response.pagination.pages >= 0,
  );
  // 4. Validate all sellers have pending status
  await ArrayUtil.asyncForEach(response.data, async (seller) => {
    TestValidator.equals(
      "seller has pending approval status",
      seller.approval_status,
      "pending",
    );
    TestValidator.equals(
      "pending seller has null rejection reason",
      seller.rejection_reason,
      null,
    );
    TestValidator.predicate(
      "seller has valid UUID",
      typeof seller.id === "string" && seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has valid email",
      typeof seller.email === "string" && seller.email.includes("@"),
    );
    TestValidator.predicate(
      "seller has valid created_at timestamp",
      typeof seller.created_at === "string" && seller.created_at.length > 0,
    );
    TestValidator.predicate(
      "seller has seller_profile",
      seller.seller_profile !== null && seller.seller_profile !== undefined,
    );
    TestValidator.predicate(
      "seller_profile has shop_name",
      typeof seller.seller_profile.shop_name === "string" &&
        seller.seller_profile.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller_profile has shop_description",
      typeof seller.seller_profile.shop_description === "string" &&
        seller.seller_profile.shop_description.length > 0,
    );
  });
  // 5. Validate sorting by created_at descending (if multiple sellers)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `seller[${i}] created_at <= seller[${i - 1}] created_at (descending order)`,
        new Date(response.data[i].created_at).getTime() <=
          new Date(response.data[i - 1].created_at).getTime(),
      );
    }
  }
}
