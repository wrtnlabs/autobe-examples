import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test product variant snapshot listing with edit history.
 *
 * 1. Authenticate as admin and complete registration
 * 2. Create a product category using admin privileges
 * 3. Authenticate as a seller and complete registration
 * 4. Create a product assigned to the category
 * 5. Create a product variant with initial SKU 'SKU-001', price 100, and option values {Color: Red, Size: Large}
 * 6. Edit the variant to change SKU to 'SKU-002' and price to 120
 * 7. Edit the variant again to change SKU to 'SKU-003' and option values {Color: Blue, Size: Large}
 * 8. As admin, call the snapshot endpoint for this variant
 * 9. Validate response returns paginated list with at least 2 snapshots (from the two edits), ordered by createdAt descending
 * 10. Verify each snapshot contains complete state: skuCode, price, optionValues as key-value pairs, and createdAt timestamp
 * 11. Verify snapshots preserve the different SKU codes and prices from each edit point in time
 */
export async function test_api_product_variant_snapshot_list_with_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Test Category",
        description: "Category for testing variant snapshots",
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller setup - create connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Product for testing variant snapshots",
        categoryId: category.id,
        basePrice: 50,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create initial variant with SKU-001, price 100, option values {Color: Red, Size: Large}
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "SKU-001",
          price: 100,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          stock: 10,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Edit variant to change SKU to 'SKU-002' and price to 120
  const variantAfterFirstEdit =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: "SKU-002",
          price: 120,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(variantAfterFirstEdit);
  // 7. Edit variant again to change SKU to 'SKU-003' and option values {Color: Blue, Size: Large}
  const variantAfterSecondEdit =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: "SKU-003",
          optionValues: [
            {
              optionName: "Color",
              optionValue: "Blue",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(variantAfterSecondEdit);
  // 8. As admin, call the snapshot endpoint for this variant
  const snapshots =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 9. Validate response returns paginated list with at least 2 snapshots (from the two edits)
  await TestValidator.predicate(
    "snapshots should have at least 2 records from edits",
    async () => snapshots.data.length >= 2 && snapshots.pagination.records >= 2,
  );
  // 10. Verify each snapshot contains complete state: skuCode, price, optionValues as key-value pairs, and createdAt timestamp
  for (const snapshot of snapshots.data) {
    await TestValidator.predicate(
      `snapshot ${snapshot.id} has required fields`,
      async () =>
        typeof snapshot.id === "string" &&
        typeof snapshot.variantId === "string" &&
        typeof snapshot.skuCode === "string" &&
        typeof snapshot.price === "number" &&
        typeof snapshot.optionValues === "object" &&
        snapshot.optionValues !== null &&
        typeof snapshot.createdAt === "string",
    );
  }
  // 11. Verify snapshots preserve the different SKU codes and prices from each edit point in time
  const skuCodes = snapshots.data.map((s) => s.skuCode);
  await TestValidator.predicate(
    "snapshots should preserve SKU-002 from first edit",
    async () => skuCodes.includes("SKU-002"),
  );
  await TestValidator.predicate(
    "snapshots should preserve SKU-003 from second edit",
    async () => skuCodes.includes("SKU-003"),
  );
  const prices = snapshots.data.map((s) => s.price);
  await TestValidator.predicate(
    "snapshots should preserve price 120 from first edit",
    async () => prices.includes(120),
  );
  // Verify ordering - newest first (descending by createdAt)
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const current = new Date(snapshots.data[i].createdAt).getTime();
    const next = new Date(snapshots.data[i + 1].createdAt).getTime();
    await TestValidator.predicate(
      `snapshot at index ${i} should be newer than index ${i + 1}`,
      async () => current >= next,
    );
  }
}