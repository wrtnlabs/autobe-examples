import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cart validation endpoint with authenticated customer.
 *
 * Validates that the cart validation endpoint returns proper structure
 * and handles empty cart validation correctly. Note: Full testing of
 * unavailable item detection requires cart add APIs not currently available.
 */
export async function test_api_cart_validate_unavailable_items_detected(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate as customer using utility function
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Call cart validation endpoint with empty cart
  const result = await api.functional.ecommerceMall.customer.cart.validate(
    customerConnection,
    {
      body: {
        autoAdjustQuantities: false,
      } satisfies IEcommerceMallCartItem.IValidate,
    },
  );
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate("result has items array", () =>
    Array.isArray(result.items),
  );
  TestValidator.predicate(
    "result has isValid boolean",
    () => typeof result.isValid === "boolean",
  );
  TestValidator.predicate(
    "result has totalPrice number",
    () => typeof result.totalPrice === "number",
  );
  // Empty cart should be valid
  TestValidator.equals("empty cart is valid", result.isValid, true);
  TestValidator.equals("empty cart has no items", result.items.length, 0);
  TestValidator.equals("empty cart total price is zero", result.totalPrice, 0);
}
