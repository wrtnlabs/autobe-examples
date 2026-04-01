import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_snapshot_retrieval_by_submitter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account who will submit the promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer submits administrator promotion request
  const promotionRequest =
    await api.functional.shoppingMall.customer.admin_promotion_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Register super administrator account to approve the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 4. Super administrator approves the promotion request (creates snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status should be approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Customer retrieves the list of snapshots to get the snapshot ID
  const snapshotList =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.index(
      customerConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  TestValidator.predicate(
    "snapshot list should have at least one snapshot",
    () => snapshotList.data.length > 0,
  );
  // Get the approved snapshot (should be the most recent one)
  const approvedSnapshot = snapshotList.data.find(
    (s) => s.status === "approved",
  );
  TestValidator.predicate(
    "should find approved snapshot in list",
    () => approvedSnapshot !== undefined,
  );
  if (!approvedSnapshot) {
    throw new Error("No approved snapshot found");
  }
  // 6. Customer retrieves the specific snapshot using the snapshot ID
  const snapshot =
    await api.functional.shoppingMall.customer.admin_promotion_requests.snapshots.at(
      customerConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: approvedSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // Validation: Verify snapshot properties
  TestValidator.equals(
    "snapshot actorType should be customer",
    snapshot.actorType,
    "customer",
  );
  TestValidator.equals(
    "snapshot status should be approved",
    snapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "respondingSuperAdministrator should not be null for approved request",
    () => snapshot.respondingSuperAdministrator !== null,
  );
  TestValidator.equals(
    "reason should be null for approved request",
    snapshot.reason,
    null,
  );
  TestValidator.predicate(
    "createdAt should be a valid timestamp",
    () => new Date(snapshot.createdAt).getTime() > 0,
  );
  // Verify snapshot.request contains original promotion request details
  TestValidator.equals(
    "snapshot request ID should match original request",
    snapshot.request.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot request reason should match original",
    snapshot.request.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "snapshot request status should be approved",
    snapshot.request.status,
    "approved",
  );
  // Verify submitter information is preserved in snapshot
  // Use assertGuard to narrow the union type for submitter
  typia.assertGuard(snapshot.request.submitter!);
  TestValidator.equals(
    "snapshot submitter ID should match customer",
    snapshot.request.submitter.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "snapshot submitter email should match customer",
    snapshot.request.submitter.email,
    customerAuth.email,
  );
  // Verify responding super administrator details
  if (snapshot.respondingSuperAdministrator) {
    TestValidator.equals(
      "responding super admin ID should match",
      snapshot.respondingSuperAdministrator.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "responding super admin email should match",
      snapshot.respondingSuperAdministrator.email,
      superAdminAuth.email,
    );
  }
}
