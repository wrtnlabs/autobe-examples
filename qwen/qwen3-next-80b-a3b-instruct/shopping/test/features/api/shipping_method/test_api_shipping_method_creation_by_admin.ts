import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import { prepare_random_shopping_mall_shipping_method } from "../../../prepare/prepare_random_shopping_mall_shipping_method";
import { generate_random_shopping_mall_admin_shipping_methods_create } from "../../../generate/generate_random_shopping_mall_admin_shipping_methods_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipping_method_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a shipping method using the generation function
  const shippingMethod =
    await generate_random_shopping_mall_admin_shipping_methods_create(
      adminConnection, // Use admin-specific connection
      {
        body: {
          code: `SHM-${RandomGenerator.alphaNumeric(5)}`, // Must be unique, non-empty string
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }), // Human-readable name
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
            wordMin: 3,
            wordMax: 7,
          }), // Detailed description
          carrier_code: RandomGenerator.alphaNumeric(8), // Carrier identifier code
          delivery_days_min: 1, // Must be positive integer (1-30)
          delivery_days_max: 5, // Must be >= delivery_days_min and <= 30
          cost_flat: 10.99, // Non-negative flat fee
        } satisfies IShoppingMallShippingMethod.ICreate,
      },
    );
  typia.assert(shippingMethod);
  // Step 3: Validate creation results
  // Verify required properties are present and correct
  TestValidator.equals(
    "shipping method code is set",
    shippingMethod.code,
    `SHM-${shippingMethod.code.split("-")[1]}`,
  );
  TestValidator.predicate(
    "name is not empty",
    () => shippingMethod.name.length > 0,
  );
  TestValidator.predicate(
    "description is not empty",
    () => shippingMethod.description.length > 0,
  );
  TestValidator.equals(
    "delivery days minimum is valid",
    shippingMethod.estimated_delivery_days_min,
    1,
  );
  TestValidator.equals(
    "delivery days maximum is valid",
    shippingMethod.estimated_delivery_days_max,
    5,
  );
  TestValidator.equals("cost flat is correct", shippingMethod.base_fee, 10.99);
  TestValidator.equals("is_active is true", shippingMethod.is_active, true);
  TestValidator.equals(
    "service_level is standard",
    shippingMethod.service_level,
    "standard",
  );
  TestValidator.equals(
    "has_tracking is true",
    shippingMethod.has_tracking,
    true,
  );
  TestValidator.equals("taxable is false", shippingMethod.taxable, false);
  TestValidator.predicate(
    "priority is between 1-10",
    () => shippingMethod.priority >= 1 && shippingMethod.priority <= 10,
  );
}
