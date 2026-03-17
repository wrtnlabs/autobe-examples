import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_variants_list_active_with_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller submits a registration approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller registration
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // 6. Seller creates a product with two variants (Red/Large and Blue/Small)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        categoryId: category.id,
        images: [],
        variants: [
          {
            sku: `RED-LARGE-${RandomGenerator.alphaNumeric(8)}`,
            priceOverride: null,
            options: [
              { key: "color", value: "Red", sequence: 0 },
              { key: "size", value: "Large", sequence: 1 },
            ],
          },
          {
            sku: `BLUE-SMALL-${RandomGenerator.alphaNumeric(8)}`,
            priceOverride: null,
            options: [
              { key: "color", value: "Blue", sequence: 0 },
              { key: "size", value: "Small", sequence: 1 },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // A. Call PATCH /shoppingMall/products/{productId}/variants with empty body (default filters)
  const variantsPage =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productId: product.id,
      body: {} satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsPage);
  // B. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current is >= 1",
    variantsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is >= 1",
    variantsPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is >= 0",
    variantsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is >= 0",
    variantsPage.pagination.pages >= 0,
  );
  // C. Validate only active (non-deleted) variants are returned
  for (const variant of variantsPage.data) {
    TestValidator.equals(
      "variant deleted_at is null",
      variant.deleted_at,
      null,
    );
  }
  // D. Validate total records = 2 (number of variants created)
  TestValidator.equals(
    "total records matches variants created",
    variantsPage.pagination.records,
    2,
  );
  // E & F. Validate variant fields and stock state for newly created variants
  for (const variant of variantsPage.data) {
    TestValidator.predicate("variant has id", variant.id.length > 0);
    TestValidator.predicate("variant has sku", variant.sku.length > 0);
    TestValidator.predicate(
      "stockQuantity is >= 0",
      variant.stockQuantity >= 0,
    );
    // F. Newly created variants with zero inventory have inStock=false, stockQuantity=0
    TestValidator.equals(
      "inStock is false for new variant",
      variant.inStock,
      false,
    );
    TestValidator.equals(
      "stockQuantity is 0 for new variant",
      variant.stockQuantity,
      0,
    );
    // Validate options array is non-empty and ordered by sequence
    TestValidator.predicate(
      "options array has at least 1 item",
      variant.options.length >= 1,
    );
    // Check options are ordered by sequence ascending
    for (let i = 1; i < variant.options.length; i++) {
      TestValidator.predicate(
        "options ordered by sequence ascending",
        variant.options[i]!.sequence >= variant.options[i - 1]!.sequence,
      );
    }
  }
  // H. Pagination test: page=1, limit=1 → only 1 variant returned but records=2
  const variantsPagePaginated =
    await api.functional.shoppingMall.products.variants.index(connection, {
      productId: product.id,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsPagePaginated);
  TestValidator.equals(
    "paginated data has 1 item",
    variantsPagePaginated.data.length,
    1,
  );
  TestValidator.equals(
    "paginated records still reflects total",
    variantsPagePaginated.pagination.records,
    2,
  );
  TestValidator.equals(
    "paginated current page is 1",
    variantsPagePaginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated limit is 1",
    variantsPagePaginated.pagination.limit,
    1,
  );
}
