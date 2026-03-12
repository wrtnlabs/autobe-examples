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
 * Test seller registration with optional shop description.
 * Verifies that sellers can register with or without shop_description,
 * and the system correctly stores and returns the description field.
 */
export async function test_api_seller_registration_with_description(
  connection: api.IConnection,
): Promise<void> {
  // Test Case 1: Register seller WITH shop description
  const sellerWithDescription: api.IConnection = { host: connection.host };
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const authorizedWithDescription = await authorize_seller_join(
    sellerWithDescription,
    {
      body: {
        shop_description: shopDescription,
      },
    },
  );
  typia.assert(authorizedWithDescription);
  // Verify description is stored and returned
  TestValidator.equals(
    "shop description matches input",
    authorizedWithDescription.shop_description,
    shopDescription,
  );
  // Verify approval status is pending
  TestValidator.equals(
    "approval status is pending with description",
    authorizedWithDescription.approval_status,
    "pending",
  );
  // Test Case 2: Register seller WITHOUT shop description
  const sellerWithoutDescription: api.IConnection = { host: connection.host };
  const authorizedWithoutDescription = await authorize_seller_join(
    sellerWithoutDescription,
    {
      body: {
        shop_description: undefined,
      },
    },
  );
  typia.assert(authorizedWithoutDescription);
  // Verify description is null when not provided
  TestValidator.equals(
    "shop description is null when not provided",
    authorizedWithoutDescription.shop_description,
    null,
  );
  // Verify approval status is pending
  TestValidator.equals(
    "approval status is pending without description",
    authorizedWithoutDescription.approval_status,
    "pending",
  );
  // Verify both sellers have valid email format
  TestValidator.predicate(
    "seller with description has valid email",
    authorizedWithDescription.email.includes("@"),
  );
  TestValidator.predicate(
    "seller without description has valid email",
    authorizedWithoutDescription.email.includes("@"),
  );
  // Verify both sellers have valid shop names
  TestValidator.predicate(
    "seller with description has valid shop name",
    authorizedWithDescription.shop_name.length >= 2,
  );
  TestValidator.predicate(
    "seller without description has valid shop name",
    authorizedWithoutDescription.shop_name.length >= 2,
  );
}
