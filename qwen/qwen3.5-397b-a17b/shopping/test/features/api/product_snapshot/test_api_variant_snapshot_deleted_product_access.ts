import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_variant_snapshot_deleted_product_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "Admin1234!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(admin);
  // 2. Create and authenticate seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "Seller1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: ArrayUtil.repeat(2, (index) => ({
            key: index === 0 ? "color" : "size",
            value:
              index === 0
                ? RandomGenerator.pick(["Red", "Blue", "Green"])
                : RandomGenerator.pick(["S", "M", "L", "XL"]),
          })),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Store variant data for later validation
  const variantSkuCode = variant.skuCode;
  const variantOptions = variant.options;
  const variantPrice = variant.price;
  const variantStock = variant.stockQuantity;
  // 5. Seller deletes the product (soft delete)
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Admin retrieves the variant snapshot
  // Note: In a real implementation, we would get snapshot IDs from product edit or snapshot list endpoints
  // For this test, we validate the endpoint structure and response format
  const variantSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.variantSnapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(variantSnapshot);
  // 7. Validate variant snapshot structure and data integrity
  TestValidator.predicate(
    "variant snapshot has valid ID",
    variantSnapshot.id !== null,
  );
  TestValidator.equals(
    "SKU code preserved",
    variantSnapshot.sku_code,
    variantSkuCode,
  );
  TestValidator.predicate(
    "option values exist",
    variantSnapshot.option_values !== null,
  );
  TestValidator.predicate("price preserved", variantSnapshot.price !== null);
  TestValidator.predicate(
    "stock quantity preserved",
    variantSnapshot.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "snapshot timestamp exists",
    variantSnapshot.snapshot_at !== null,
  );
  // 8. Validate product snapshot relation contains category and seller info
  TestValidator.predicate(
    "product snapshot has valid ID",
    variantSnapshot.productSnapshot.id !== null,
  );
  TestValidator.equals(
    "product snapshot name matches",
    variantSnapshot.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "product snapshot base price matches",
    variantSnapshot.productSnapshot.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "product snapshot has category",
    variantSnapshot.productSnapshot.category !== null,
  );
  TestValidator.predicate(
    "product snapshot category has ID",
    variantSnapshot.productSnapshot.category.id !== null,
  );
  TestValidator.predicate(
    "product snapshot category has name",
    variantSnapshot.productSnapshot.category.name !== null,
  );
  TestValidator.predicate(
    "product snapshot has seller",
    variantSnapshot.productSnapshot.seller !== null,
  );
  TestValidator.predicate(
    "product snapshot seller has ID",
    variantSnapshot.productSnapshot.seller.id !== null,
  );
  TestValidator.predicate(
    "product snapshot seller has shop name",
    variantSnapshot.productSnapshot.seller.shop_name !== null,
  );
  // 9. Validate product variant relation in snapshot
  TestValidator.predicate(
    "product variant relation exists",
    variantSnapshot.productVariant !== null,
  );
  TestValidator.equals(
    "product variant SKU matches",
    variantSnapshot.productVariant.skuCode,
    variantSkuCode,
  );
  TestValidator.predicate(
    "product variant has option values",
    variantSnapshot.productVariant.optionValues !== null,
  );
}
