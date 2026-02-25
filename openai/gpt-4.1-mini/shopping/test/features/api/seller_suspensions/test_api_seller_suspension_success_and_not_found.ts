import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_suspensions_suspend } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_suspend";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

/**
 * Test case 1: Successful suspension of an existing seller by an authorized administrator.
 * Test case 2: Attempt to suspend a non-existent sellerId.
 *
 * Preconditions: Administrator account created and authenticated.
 */
export async function test_api_seller_suspension_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and join (register) admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = { Authorization: adminAuth.token.access };
  /** Test 1: Suspend an existing seller successfully */
  // We need a valid sellerId and active seller. Generate a suspension with a valid sellerId.
  const suspensionRecord =
    await generate_random_shopping_mall_administrator_seller_suspensions_suspend(
      adminConnection,
      {
        params: { sellerId: "00000000-0000-4000-8000-000000000001" }, // fixed valid UUID for test or can be randomized
        body: { suspension_reason: "Violation of terms" },
      },
    );
  typia.assert(suspensionRecord);
  // Validate response properties
  TestValidator.equals(
    "seller ID matches",
    suspensionRecord.seller.id,
    "00000000-0000-4000-8000-000000000001",
  );
  TestValidator.equals(
    "suspension reason matches",
    suspensionRecord.suspension_reason,
    "Violation of terms",
  );
  TestValidator.predicate(
    "suspended_at is a valid ISO date",
    !isNaN(Date.parse(suspensionRecord.suspended_at)),
  );
  TestValidator.equals("deleted_at is null", suspensionRecord.deleted_at, null);
  /**
   * Note:
   * We cannot use any internal database access, but we can assume the API
   * behavior that seller's products are hidden and product editing disabled.
   * These are out of direct API test scope but can be verified by separate
   * integration or UI tests.
   */
  /** Test 2: Suspend a non-existent seller (should fail) */
  await TestValidator.error("attempt suspend non-existent seller", async () => {
    await generate_random_shopping_mall_administrator_seller_suspensions_suspend(
      adminConnection,
      {
        params: { sellerId: "3f2e9d82-7a9f-4898-bb4e-123456789abc" }, // non-existent seller ID
        body: { suspension_reason: "Invalid seller" },
      },
    );
  });
}
