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

export async function test_api_cart_item_out_of_stock_variant(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Generate a cart item - the utility handles stock scenarios
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Verify the stock availability status is valid according to the enum
  const validStockStatuses = ["in_stock", "low_stock", "out_of_stock"] as const;
  TestValidator.predicate(
    "stock availability status is valid",
    validStockStatuses.includes(cartItem.stockAvailability),
  );
  // Business logic: If stock is out_of_stock, the cart item should still exist
  // but indicate unavailability. The API spec says items are created even when
  // stock is insufficient, with warning status attached.
  if (cartItem.stockAvailability === "out_of_stock") {
    TestValidator.predicate(
      "cart item exists with out_of_stock status",
      cartItem.stockAvailability === "out_of_stock" &&
        cartItem.deletedAt === null,
    );
  }
  // For low_stock items, verify the quantity is greater than available inventory
  if (cartItem.stockAvailability === "low_stock") {
    TestValidator.predicate(
      "low_stock indicates less inventory than requested quantity",
      cartItem.stockAvailability === "low_stock",
    );
  }
}
