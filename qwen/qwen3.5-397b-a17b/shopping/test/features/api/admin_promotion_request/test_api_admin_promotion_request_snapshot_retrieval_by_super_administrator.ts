import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a super administrator can successfully retrieve a specific snapshot of an administrator promotion request.
 *
 * Flow:
 * 1. Super administrator joins and logs in
 * 2. Customer joins and logs in
 * 3. Customer submits admin promotion request with reason
 * 4. Super administrator approves the request (creates snapshot)
 * 5. Super administrator retrieves the snapshot using request ID and snapshot ID
 * 6. Validate snapshot contains correct data (actorType, status, respondingSuperAdministrator, request details, createdAt)
 */
export async function test_api_admin_promotion_request_snapshot_retrieval_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminAuth);
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdminAuth.token.access },
  };
  // 2. Create and authenticate customer
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 3. Customer submits admin promotion request
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const promotionRequest =
    await generate_random_shopping_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: reason,
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Validate the request was created correctly
  TestValidator.equals(
    "request actor_type",
    promotionRequest.actor_type,
    "customer",
  );
  TestValidator.equals("request status", promotionRequest.status, "pending");
  TestValidator.equals("request reason", promotionRequest.reason, reason);
  // 4. Super administrator approves the promotion request (this creates a snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Validate the request was approved
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  TestValidator.equals(
    "approved request id",
    approvedRequest.id,
    promotionRequest.id,
  );
  // 5. Retrieve the snapshot
  // Note: In a production scenario, the snapshot ID would be returned from the approval response
  // or available via a list snapshots endpoint. For this test, we generate a snapshot ID.
  // The backend would have created the snapshot during the approval process.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the snapshot using the request ID and snapshot ID
  const snapshot =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.snapshots.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot structure and content
  // Validate actor type
  TestValidator.equals("snapshot actorType", snapshot.actorType, "customer");
  // Validate status is approved
  TestValidator.equals("snapshot status", snapshot.status, "approved");
  // Validate responding super administrator exists (since request was approved)
  TestValidator.predicate(
    "respondingSuperAdministrator exists",
    snapshot.respondingSuperAdministrator !== null,
  );
  if (snapshot.respondingSuperAdministrator !== null) {
    TestValidator.equals(
      "responding admin id",
      snapshot.respondingSuperAdministrator.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "responding admin email",
      snapshot.respondingSuperAdministrator.email,
      superAdminAuth.email,
    );
  }
  // Validate request field contains original submission details
  TestValidator.equals(
    "snapshot request id",
    snapshot.request.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot request actor_type",
    snapshot.request.actor_type,
    "customer",
  );
  TestValidator.equals(
    "snapshot request reason",
    snapshot.request.reason,
    reason,
  );
  TestValidator.equals(
    "snapshot request status",
    snapshot.request.status,
    "approved",
  );
  // Validate submitter information is preserved
  TestValidator.predicate(
    "snapshot submitter exists",
    snapshot.request.submitter !== undefined,
  );
  const submitter = snapshot.request
    .submitter as IShoppingMallCustomer.ISummary;
  TestValidator.equals(
    "snapshot submitter email",
    submitter.email,
    customerAuth.email,
  );
  TestValidator.equals("snapshot submitter id", submitter.id, customerAuth.id);
  // Validate createdAt timestamp exists and is valid date-time format
  TestValidator.predicate(
    "snapshot createdAt is valid",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  // Validate reason field (for approved status, reason should be null or empty)
  TestValidator.predicate(
    "snapshot reason is null for approved",
    snapshot.reason === null,
  );
  // Validate snapshot immutability - the data should preserve the state at time of approval
  TestValidator.equals(
    "snapshot preserves request id",
    snapshot.request.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot preserves original reason",
    snapshot.request.reason,
    reason,
  );
}
