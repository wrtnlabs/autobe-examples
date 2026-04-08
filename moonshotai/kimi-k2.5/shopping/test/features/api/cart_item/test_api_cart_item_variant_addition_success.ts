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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_item_variant_addition_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Prepare cart item data with specific quantity
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  // Step 3: Add product variant to cart using generation utility
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: quantity,
        },
      },
    );
  // Step 4: Validate complete cart item structure
  typia.assert(cartItem);
  // Step 5: Verify business logic and relationships
  TestValidator.equals(
    "quantity matches requested",
    cartItem.quantity,
    quantity,
  );
  TestValidator.predicate(
    "cart item has valid customer",
    cartItem.customer !== null,
  );
  TestValidator.predicate(
    "cart item has valid product variant",
    cartItem.productVariant !== null,
  );
  TestValidator.predicate(
    "product variant has SKU code",
    cartItem.productVariant.skuCode !== "",
  );
  TestValidator.predicate(
    "product variant has options array",
    Array.isArray(cartItem.productVariant.options),
  );
  TestValidator.predicate(
    "stock availability is valid",
    ["in_stock", "low_stock", "out_of_stock"].includes(
      cartItem.stockAvailability,
    ),
  );
}
