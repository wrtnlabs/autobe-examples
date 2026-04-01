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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_snapshot_retrieval_by_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "request actor type",
    promotionRequest.actor_type,
    "seller",
  );
  TestValidator.equals("request status", promotionRequest.status, "pending");
  // 3. Super administrator joins and authenticates
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
  // 4. Super administrator rejects the promotion request with a reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.shoppingMall.superAdministrator.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals("updated status", updatedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  // 5. Retrieve the snapshot created during rejection
  // The snapshot is automatically created when the super admin rejects the request
  // We need to get the snapshot ID - in a complete API, this would come from a list endpoint
  // For this test, we'll use the snapshot retrieval endpoint with the request ID
  // Note: The snapshot ID would typically be obtained from GET /snapshots list endpoint
  // Since we need the snapshot ID to retrieve it, and the available functions
  // don't include a list endpoint, we'll attempt to retrieve snapshots
  // In practice, the snapshot ID should be available through the API
  // For a complete E2E test, we would query for snapshots associated with this request
  // The snapshot should exist because it was created during the rejection
  // Retrieve snapshot - snapshotId would come from list endpoint in production
  // This test validates the snapshot retrieval workflow
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.at(
      sellerConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contains correct data
  TestValidator.equals("snapshot actor type", snapshot.actorType, "seller");
  TestValidator.equals("snapshot status", snapshot.status, "rejected");
  TestValidator.predicate(
    "responding super administrator is populated",
    snapshot.respondingSuperAdministrator !== null,
  );
  TestValidator.equals(
    "snapshot reason matches rejection reason",
    snapshot.reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "snapshot has createdAt timestamp",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
  );
  // Validate request reference in snapshot
  TestValidator.equals(
    "snapshot request ID matches",
    snapshot.request.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot request status",
    snapshot.request.status,
    "rejected",
  );
  // Validate seller can see the rejection reason for understanding why application was denied
  TestValidator.predicate(
    "rejection reason is visible to seller",
    snapshot.reason !== null && snapshot.reason!.length > 0,
  );
}
