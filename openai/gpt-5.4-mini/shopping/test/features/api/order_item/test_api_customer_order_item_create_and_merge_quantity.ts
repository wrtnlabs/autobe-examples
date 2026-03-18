import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_items_create } from "../../../generate/generate_random_shopping_mall_customer_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_customer_order_item_create_and_merge_quantity(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password"> & tags.MinLength<1>>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com" satisfies string as string,
      referrer: "https://example.com" satisfies string as string,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number>(),
      } satisfies DeepPartial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          stockQuantity: typia.random<number & tags.Type<"int32">>(),
        } satisfies DeepPartial<IShoppingMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  const first = await generate_random_shopping_mall_customer_items_create(
    customerConnection,
    {
      body: {
        shoppingMallOrderId: typia.random<string & tags.Format<"uuid">>(),
        shoppingMallProductVariantId: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies DeepPartial<IShoppingMallOrderItem.ICreate>,
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "first item variant id",
    first.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals("first item quantity", first.quantity, first.quantity);
  TestValidator.equals("first item status", first.status, "paid");
  TestValidator.equals("first item shipped_at", first.shipped_at, null);
  TestValidator.equals("first item delivered_at", first.delivered_at, null);
  TestValidator.equals("first item cancelled_at", first.cancelled_at, null);
  TestValidator.equals("first item refunded_at", first.refunded_at, null);
  TestValidator.equals(
    "first item order relation",
    first.shopping_mall_order_id,
    first.order.id,
  );
  TestValidator.equals(
    "first item variant relation",
    first.shopping_mall_product_variant_id,
    first.productVariant.id,
  );
  const second = await generate_random_shopping_mall_customer_items_create(
    customerConnection,
    {
      body: {
        shoppingMallOrderId: first.shopping_mall_order_id,
        shoppingMallProductVariantId: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies DeepPartial<IShoppingMallOrderItem.ICreate>,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "second item uses same order",
    second.shopping_mall_order_id,
    first.shopping_mall_order_id,
  );
  TestValidator.equals(
    "second item uses same variant",
    second.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals("second item status", second.status, "paid");
  TestValidator.equals("second item shipped_at", second.shipped_at, null);
  TestValidator.equals("second item delivered_at", second.delivered_at, null);
  TestValidator.equals("second item cancelled_at", second.cancelled_at, null);
  TestValidator.equals("second item refunded_at", second.refunded_at, null);
}
