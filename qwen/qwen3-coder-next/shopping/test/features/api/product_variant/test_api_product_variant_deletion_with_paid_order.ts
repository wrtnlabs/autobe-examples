import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_deletion_with_paid_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(3),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerJoinBody,
    },
  );
  typia.assert(seller);
  // 2. Seller creates a product with a variant
  const productBody = {
    name: RandomGenerator.name(5),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    variants: [
      {
        sku_code: RandomGenerator.alphaNumeric(10),
      } satisfies IEcommerceMallProductVariant.ICreate,
    ],
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  TestValidator.notEquals("product has variant", product.variants.length, 0);
  const variant = product.variants[0];
  typia.assert(variant);
  // 3. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: customerJoinBody,
  });
  // 4. Place an order with the variant (status = paid)
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  TestValidator.predicate(
    "order has order items",
    order.order_items.length > 0,
  );
  const orderItem = order.order_items.find(
    (item) => item.variant.id === variant.id,
  );
  TestValidator.equals(
    "order item variant matches",
    orderItem?.variant.id,
    variant.id,
  );
  // 5. Attempt to delete the variant with paid order
  await TestValidator.error(
    "variant deletion fails with paid order",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.erase(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
  // 6. Verify variant still exists
  const refreshedProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: "dummy",
          description: "dummy",
          base_price: 1000,
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(refreshedProduct);
}