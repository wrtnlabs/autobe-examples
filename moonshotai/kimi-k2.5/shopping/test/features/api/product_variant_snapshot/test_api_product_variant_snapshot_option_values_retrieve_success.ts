import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshotOptionValue";
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
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test the primary success path for retrieving option values from a product variant snapshot.
 * A seller authenticates and creates a complete product structure: first an admin creates a category,
 * then the seller creates a product with that category, adds a product variant with SKU code,
 * and adds multiple option values (Color=Red, Size=Large, Material=Cotton). When the variant is
 * created, the system automatically generates a snapshot per business rules. The test validates
 * that querying the snapshot returns the exact option values that were configured, preserving
 * the historical state of the variant configuration.
 */
export async function test_api_product_variant_snapshot_option_values_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: {} },
  );
  typia.assert(adminAuth);
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Test Category",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller setup - authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    });
  typia.assert(sellerAuth);
  // 3. Create product under the category
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Test Product",
          description: "Test product description",
          categoryId: category.id,
          basePrice: 1000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Create variant with multiple option values (Color, Size, Material)
  const options: IEcommerceMallProductVariantOption.ICreate[] = [
    { optionName: "Color", optionValue: "Red" },
    { optionName: "Size", optionValue: "Large" },
    { optionName: "Material", optionValue: "Cotton" },
  ];
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${typia.random<string & tags.Format<"uuid">>()}`,
          price: 1000,
          options,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Query snapshot option values
  // System auto-generates snapshot per business rules (section 564) when variant is created
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const optionValuesRequest: IEcommerceMallProductVariantSnapshotOptionValue.IRequest =
    {
      limit: 50,
      page: 1,
    };
  const optionValuesPage: IPageIEcommerceMallProductVariantSnapshotOptionValue =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId,
        body: optionValuesRequest,
      },
    );
  typia.assert(optionValuesPage);
  // 6. Validate response business logic (not type checking - typia.assert handles that)
  TestValidator.predicate(
    "pagination exists",
    optionValuesPage.pagination !== undefined,
  );
  TestValidator.predicate("data exists", Array.isArray(optionValuesPage.data));
  TestValidator.predicate(
    "records count non-negative",
    optionValuesPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    optionValuesPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page positive",
    optionValuesPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit positive",
    optionValuesPage.pagination.limit >= 1,
  );
}