import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_order_item_variant_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Establish product catalog context - product must exist for variant creation
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create variant with specific options to capture in snapshot
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<500>
          >(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["Small", "Medium", "Large"]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant);
  // Retrieve variant snapshot (pre-existing order data assumed per scenario)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.seller.orders.items.variantSnapshot.invert(
      sellerConnection,
      {
        orderId,
        orderItemId,
      },
    );
  typia.assert<IEcommerceMallProductVariantSnapshot.IInvert>(snapshot);
  // Validate snapshot business logic
  TestValidator.predicate(
    "snapshot SKU code exists and is valid",
    snapshot.skuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot price is non-negative",
    snapshot.price >= 0,
  );
  TestValidator.predicate(
    "snapshot has option values",
    snapshot.optionValues.length > 0,
  );
  // Validate each option has required fields
  for (const option of snapshot.optionValues) {
    TestValidator.predicate(
      `option ${option.option_name} has non-empty value`,
      option.option_value.length > 0,
    );
  }
  // Validate order item reference
  TestValidator.predicate(
    "order item has valid status",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      snapshot.orderItem.status,
    ),
  );
  TestValidator.predicate(
    "order item quantity is positive",
    snapshot.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "order item price at purchase is positive",
    snapshot.orderItem.priceAtPurchase >= 0,
  );
}
