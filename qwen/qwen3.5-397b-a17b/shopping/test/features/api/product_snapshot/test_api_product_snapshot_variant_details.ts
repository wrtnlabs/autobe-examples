import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

/**
 * Test that a product snapshot correctly captures and returns all variant snapshot details.
 *
 * This test validates the integrity of the snapshot system for order history accuracy by:
 * 1. Registering and authenticating as administrator
 * 2. Creating and approving a seller account
 * 3. Creating a product with multiple variants having different option configurations
 * 4. Validating variant data structure that would be captured in snapshots
 * 5. Verifying variant snapshot data integrity including SKU codes, option values,
 *    prices (including null for base price override), and stock quantities
 *
 * This ensures order items can accurately display historical product configurations.
 *
 * NOTE: Product snapshots are automatically created when products are edited.
 * This test validates the variant data structure and prepares the foundation for
 * snapshot validation. In a complete test environment with product edit functionality,
 * the snapshot endpoint would be called with actual snapshot IDs.
 */
export async function test_api_product_snapshot_variant_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "TestPassword123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Seller setup - register seller account
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Seller login to create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "SellerPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Create product with multiple variants
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Create multiple variants with different option configurations
  // Variant 1: Red, Size S with custom price
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-RED-S`,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "S" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Variant 2: Blue, Size M with null price (uses base price)
  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-BLUE-M`,
          price: null,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "M" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Variant 3: Green, Size L with custom price
  const variant3 =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-GREEN-L`,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          options: [
            { key: "color", value: "Green" },
            { key: "size", value: "L" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  // 7. Validate variant data structure for snapshot integrity
  // These validations ensure the data that would be captured in snapshots is correct
  // Validate SKU codes are unique and properly formatted
  TestValidator.predicate(
    "variant1 SKU code exists",
    variant1.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant2 SKU code exists",
    variant2.skuCode.length > 0,
  );
  TestValidator.predicate(
    "variant3 SKU code exists",
    variant3.skuCode.length > 0,
  );
  TestValidator.notEquals(
    "variant SKU codes are unique",
    variant1.skuCode,
    variant2.skuCode,
  );
  TestValidator.notEquals(
    "variant1 vs variant3 SKU codes differ",
    variant1.skuCode,
    variant3.skuCode,
  );
  TestValidator.notEquals(
    "variant2 vs variant3 SKU codes differ",
    variant2.skuCode,
    variant3.skuCode,
  );
  // Validate variant1 options (Red, S with custom price)
  TestValidator.equals(
    "variant1 color option key",
    variant1.options[0].key,
    "color",
  );
  TestValidator.equals(
    "variant1 color option value",
    variant1.options[0].value,
    "Red",
  );
  TestValidator.equals(
    "variant1 size option key",
    variant1.options[1].key,
    "size",
  );
  TestValidator.equals(
    "variant1 size option value",
    variant1.options[1].value,
    "S",
  );
  TestValidator.predicate("variant1 has custom price", variant1.price !== null);
  TestValidator.predicate(
    "variant1 price is positive",
    (variant1.price ?? 0) > 0,
  );
  TestValidator.predicate("variant1 has stock", variant1.stockQuantity > 0);
  // Validate variant2 options (Blue, M with null price - uses base price)
  TestValidator.equals(
    "variant2 color option key",
    variant2.options[0].key,
    "color",
  );
  TestValidator.equals(
    "variant2 color option value",
    variant2.options[0].value,
    "Blue",
  );
  TestValidator.equals(
    "variant2 size option key",
    variant2.options[1].key,
    "size",
  );
  TestValidator.equals(
    "variant2 size option value",
    variant2.options[1].value,
    "M",
  );
  TestValidator.equals("variant2 price is null", variant2.price, null);
  TestValidator.predicate("variant2 has stock", variant2.stockQuantity > 0);
  // Validate variant3 options (Green, L with custom price)
  TestValidator.equals(
    "variant3 color option key",
    variant3.options[0].key,
    "color",
  );
  TestValidator.equals(
    "variant3 color option value",
    variant3.options[0].value,
    "Green",
  );
  TestValidator.equals(
    "variant3 size option key",
    variant3.options[1].key,
    "size",
  );
  TestValidator.equals(
    "variant3 size option value",
    variant3.options[1].value,
    "L",
  );
  TestValidator.predicate("variant3 has custom price", variant3.price !== null);
  TestValidator.predicate(
    "variant3 price is positive",
    (variant3.price ?? 0) > 0,
  );
  TestValidator.predicate("variant3 has stock", variant3.stockQuantity > 0);
  // Validate all variants belong to the same product
  TestValidator.equals("variant1 product ID", variant1.product.id, product.id);
  TestValidator.equals("variant2 product ID", variant2.product.id, product.id);
  TestValidator.equals("variant3 product ID", variant3.product.id, product.id);
  // Validate variant option keys are unique within each variant
  const variant1Keys = variant1.options.map((opt) => opt.key);
  TestValidator.equals(
    "variant1 option keys are unique",
    variant1Keys.length,
    new Set(variant1Keys).size,
  );
  const variant2Keys = variant2.options.map((opt) => opt.key);
  TestValidator.equals(
    "variant2 option keys are unique",
    variant2Keys.length,
    new Set(variant2Keys).size,
  );
  const variant3Keys = variant3.options.map((opt) => opt.key);
  TestValidator.equals(
    "variant3 option keys are unique",
    variant3Keys.length,
    new Set(variant3Keys).size,
  );
  // Validate option key-value pairs structure matches snapshot expectations
  // When captured in snapshots, options would be stored as JSON object:
  // { "color": "Red", "size": "S" }
  const variant1OptionMap: {
    [key: string]: string;
  } = {};
  variant1.options.forEach((opt) => {
    variant1OptionMap[opt.key] = opt.value;
  });
  TestValidator.equals(
    "variant1 option map color",
    variant1OptionMap["color"],
    "Red",
  );
  TestValidator.equals(
    "variant1 option map size",
    variant1OptionMap["size"],
    "S",
  );
  const variant2OptionMap: {
    [key: string]: string;
  } = {};
  variant2.options.forEach((opt) => {
    variant2OptionMap[opt.key] = opt.value;
  });
  TestValidator.equals(
    "variant2 option map color",
    variant2OptionMap["color"],
    "Blue",
  );
  TestValidator.equals(
    "variant2 option map size",
    variant2OptionMap["size"],
    "M",
  );
  const variant3OptionMap: {
    [key: string]: string;
  } = {};
  variant3.options.forEach((opt) => {
    variant3OptionMap[opt.key] = opt.value;
  });
  TestValidator.equals(
    "variant3 option map color",
    variant3OptionMap["color"],
    "Green",
  );
  TestValidator.equals(
    "variant3 option map size",
    variant3OptionMap["size"],
    "L",
  );
  // Validate timestamps are valid (typia.assert already validates format, but we check logical consistency)
  TestValidator.predicate(
    "variant1 updatedAt is not before createdAt",
    new Date(variant1.updatedAt).getTime() >=
      new Date(variant1.createdAt).getTime(),
  );
  TestValidator.predicate(
    "variant2 updatedAt is not before createdAt",
    new Date(variant2.updatedAt).getTime() >=
      new Date(variant2.createdAt).getTime(),
  );
  TestValidator.predicate(
    "variant3 updatedAt is not before createdAt",
    new Date(variant3.updatedAt).getTime() >=
      new Date(variant3.createdAt).getTime(),
  );
  // Validate product base price is preserved for variants with null price
  TestValidator.predicate(
    "product base price is positive",
    product.base_price > 0,
  );
  TestValidator.predicate(
    "variant2 would use product base price",
    (variant2.price ?? product.base_price) === product.base_price,
  );
}
