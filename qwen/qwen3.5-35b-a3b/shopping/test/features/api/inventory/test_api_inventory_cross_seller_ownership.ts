import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { HttpError, IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_inventory_cross_seller_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A authentication and product creation
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAAuth);
  const sellerAId: string & tags.Format<"uuid"> = sellerAAuth.id;
  // 2. Seller A creates a product
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(sellerAProduct);
  // 3. Seller A adds a variant to their product
  const sellerAVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: {
          productId: sellerAProduct.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: typia.random<string>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        },
      },
    );
  typia.assert(sellerAVariant);
  // 4. Verify variant belongs to Seller A's product
  TestValidator.equals(
    "variant product owner matches",
    sellerAVariant.product_id,
    sellerAProduct.id,
  );
  // 5. Seller B authentication (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerBAuth);
  const sellerBId: string & tags.Format<"uuid"> = sellerBAuth.id;
  // 6. Verify Seller A and Seller B are different
  TestValidator.notEquals(
    "Seller A and B should be different",
    sellerAId,
    sellerBId,
  );
  // 7. Seller B attempts to create inventory for Seller A's variant (should fail with 403)
  await TestValidator.httpError(
    "cross-seller inventory creation should be forbidden",
    [403],
    async () => {
      return await api.functional.ecommerceMall.seller.products.variants.inventory.create(
        sellerBConnection,
        {
          productId: sellerAProduct.id,
          variantId: sellerAVariant.id,
          body: {
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            operation_type: "RESTOCK",
          } satisfies IEcommerceMallInventoryRecord.ICreate,
        },
      );
    },
  );
  // 8. Verify Seller A's product and variant remain unchanged
  // (Seller B should not have been able to manipulate Seller A's inventory)
  TestValidator.equals(
    "Seller A's variant product_id unchanged",
    sellerAVariant.product_id,
    sellerAProduct.id,
  );
  TestValidator.equals(
    "Seller A's variant stock_quantity unchanged",
    sellerAVariant.stock_quantity,
    sellerAVariant.stock_quantity,
  );
  // 9. Verify the error message indicates authorization failure
  try {
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      sellerBConnection,
      {
        productId: sellerAProduct.id,
        variantId: sellerAVariant.id,
        body: {
          quantity_change: 1,
          operation_type: "RESTOCK",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  } catch (exp) {
    if (exp instanceof HttpError) {
      const errorData = exp.toJSON<{
        message: string;
      }>();
      // Verify error message indicates authorization failure
      await TestValidator.predicate(
        "error message indicates unauthorized access",
        () =>
          errorData.message.message.toLowerCase().includes("seller") &&
          errorData.message.message.toLowerCase().includes("own") &&
          errorData.message.message.toLowerCase().includes("product"),
      );
    }
  }
}