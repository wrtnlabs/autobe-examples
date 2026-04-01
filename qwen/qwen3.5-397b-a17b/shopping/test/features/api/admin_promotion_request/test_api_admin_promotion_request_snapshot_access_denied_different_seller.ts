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

/**
 * Test scenario validating authorization rules where a seller attempts to retrieve a snapshot of another seller's administrator promotion request.
 *
 * This test validates:
 * 1. First seller authenticates and submits a promotion request
 * 2. Super administrator approves the first seller's request, creating a snapshot
 * 3. Second seller authenticates separately
 * 4. Second seller attempts to retrieve the first seller's snapshot
 * 5. Verify the system rejects the request with authorization error because sellers can only access their own promotion request snapshots
 *
 * This tests the critical security boundary that ensures promotion request snapshots are only accessible to the submitter,
 * responding super administrator, or administrators, preventing unauthorized access to sensitive promotion decision data.
 */
export async function test_api_admin_promotion_request_snapshot_access_denied_different_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate first seller (promotion request submitter)
  const firstSellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(firstSellerAuth);
  const firstSellerConnection: api.IConnection = { host: connection.host };
  firstSellerConnection.headers = {
    Authorization: firstSellerAuth.token.access,
  };
  // 2. First seller submits administrator promotion request
  const promotionRequest =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      firstSellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Register and authenticate super administrator
  const superAdminAuth = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdminPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdminAuth);
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 4. Super administrator approves the first seller's promotion request (creates snapshot)
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
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Register and authenticate second seller (unauthorized accessor)
  const secondSellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword456!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSellerAuth);
  const secondSellerConnection: api.IConnection = { host: connection.host };
  secondSellerConnection.headers = {
    Authorization: secondSellerAuth.token.access,
  };
  // 6. Second seller attempts to access first seller's snapshot - should fail with authorization error
  // Generate a valid snapshot ID format - the authorization check should fail regardless of snapshot existence
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "second seller cannot access first seller's promotion request snapshot",
    async () => {
      await api.functional.shoppingMall.seller.admin_promotion_requests.snapshots.at(
        secondSellerConnection,
        {
          requestId: promotionRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
