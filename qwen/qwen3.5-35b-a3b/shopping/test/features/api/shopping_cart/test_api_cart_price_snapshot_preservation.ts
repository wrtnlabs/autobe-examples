import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_price_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and obtain authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create authenticated customer connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 2. Generate a cart and add first product variant
  const firstCartItem =
    await generate_random_ecommerce_mall_customer_carts_cart_items_create(
      authenticatedConnection,
      {
        body: {
          quantity: 2 satisfies IEcommerceMallCartItem.ICreate["quantity"],
        },
      },
    );
  typia.assert(firstCartItem);
  const originalPrice = firstCartItem.price;
  const originalVariantId = firstCartItem.variant.id;
  // 3. Add the same variant again (should merge quantities)
  const secondAddition =
    await generate_random_ecommerce_mall_customer_carts_cart_items_create(
      authenticatedConnection,
      {
        body: {
          variant_id: originalVariantId,
          quantity: 3 satisfies IEcommerceMallCartItem.ICreate["quantity"],
        },
      },
    );
  typia.assert(secondAddition);
  // 4. Validate price snapshot preservation
  // The second addition should merge with existing item, maintaining original price
  TestValidator.equals(
    "price snapshot preserved on quantity merge",
    secondAddition.price,
    originalPrice,
  );
  // 5. Verify variant reference is consistent
  TestValidator.equals(
    "variant reference consistent after merge",
    secondAddition.variant.id,
    originalVariantId,
  );
  // 6. Validate quantity was merged (not duplicated)
  TestValidator.equals(
    "quantities merged correctly",
    secondAddition.quantity,
    originalPrice,
  );
  // 7. Verify immutability - price cannot be modified through cart operations
  TestValidator.predicate(
    "price snapshot is immutable",
    () => secondAddition.price === originalPrice,
  );
}
