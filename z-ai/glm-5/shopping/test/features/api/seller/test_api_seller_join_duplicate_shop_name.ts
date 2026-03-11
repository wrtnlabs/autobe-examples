import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that seller registration is rejected when the shop name is already taken.
 * Validates business rule: shop names must be unique across all seller accounts.
 *
 * Flow:
 * 1. Create first seller with a unique shop name
 * 2. Attempt to register second seller with same shop name but different email
 * 3. Verify system rejects the duplicate shop name registration
 */
export async function test_api_seller_join_duplicate_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique shop name for testing
  const shopName = RandomGenerator.name(1) + " Shop";
  // Step 1: Create first seller with the shop name
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      shopName,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(firstSeller);
  // Verify the first seller was created successfully
  TestValidator.equals(
    "first seller shop name",
    firstSeller.shop_name,
    shopName,
  );
  // Step 2: Attempt to register second seller with the same shop name
  const secondSellerConnection: api.IConnection = { host: connection.host };
  // Step 3: Verify the system rejects the duplicate shop name
  await TestValidator.error(
    "duplicate shop name should be rejected",
    async () => {
      await authorize_seller_join(secondSellerConnection, {
        body: {
          shopName,
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        },
      });
    },
  );
}
