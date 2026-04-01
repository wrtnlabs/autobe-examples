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

/**
 * Test administrator promotion request snapshot retrieval.
 *
 * This test validates the complete workflow:
 * 1. Customer submits admin promotion request (creates pending snapshot)
 * 2. Super administrator approves the request (creates approved snapshot)
 * 3. Super administrator retrieves snapshots and validates the audit trail
 *
 * Validates snapshot immutability, proper status progression, and correct
 * respondingSuperAdministrator field population.
 */
export async function test_api_admin_promotion_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register customer and submit promotion request
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Submit admin promotion request as customer
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals("initial status", promotionRequest.status, "pending");
  // 2. Setup: Register super administrator
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 3. Super administrator approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  // 4. Retrieve snapshots as super administrator
  const snapshotsResponse =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.index(
      superAdminConnection,
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
  typia.assert(snapshotsResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", snapshotsResponse.pagination.current, 1);
  TestValidator.predicate("limit set", snapshotsResponse.pagination.limit > 0);
  TestValidator.predicate(
    "has records",
    snapshotsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pages calculated",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 6. Validate snapshots exist and structure
  TestValidator.predicate("has snapshots", snapshotsResponse.data.length >= 2);
  const snapshots = snapshotsResponse.data;
  // First snapshot should be the approval (newest, sorted desc)
  const approvalSnapshot = snapshots[0];
  TestValidator.equals(
    "approval snapshot status",
    approvalSnapshot.status,
    "approved",
  );
  TestValidator.equals(
    "approval snapshot actorType",
    approvalSnapshot.actorType,
    "customer",
  );
  TestValidator.predicate(
    "approval has responding admin",
    approvalSnapshot.respondingSuperAdministrator !== null,
  );
  TestValidator.equals(
    "responding admin email",
    approvalSnapshot.respondingSuperAdministrator!.email,
    superAdminAuth.email,
  );
  // Find the pending snapshot
  const pendingSnapshot = snapshots.find((s) => s.status === "pending");
  TestValidator.predicate(
    "pending snapshot exists",
    pendingSnapshot !== undefined,
  );
  if (pendingSnapshot) {
    TestValidator.equals(
      "pending snapshot actorType",
      pendingSnapshot.actorType,
      "customer",
    );
    TestValidator.equals(
      "pending snapshot has null responding admin",
      pendingSnapshot.respondingSuperAdministrator,
      null,
    );
  }
  // 7. Validate snapshot ordering (newest first)
  for (let i = 0; i < snapshots.length - 1; i++) {
    const current = new Date(snapshots[i].createdAt).getTime();
    const next = new Date(snapshots[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `snapshot ${i} is newer than ${i + 1}`,
      current >= next,
    );
  }
  // 8. Validate approved snapshot reason is null
  TestValidator.equals(
    "approved snapshot reason is null",
    approvalSnapshot.reason,
    null,
  );
}
