import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin can reassign a product to a different brand
 * and change its status with a single update call.
 *
 * Business flow simulated by this test:
 *
 * 1. Register a new platform admin (POST /auth/platformAdmin/join) and obtain an
 *    authenticated connection context.
 * 2. Create a category tree so that the catalog has basic configuration.
 * 3. Create two brands, Brand A and Brand B.
 * 4. Create an initial product associated with Brand A in a draft-like status.
 * 5. Update that product using PUT
 *    /shoppingMall/platformAdmin/products/{productCode}, changing its brand to
 *    Brand B and its status to another valid value, also modifying a
 *    descriptive field.
 * 6. Assert that immutable fields (id, code, seller summary) are unchanged, while
 *    brand summary and status reflect the update and at least one description
 *    field is updated.
 */
export async function test_api_platform_admin_product_update_change_brand_and_status(
  connection: api.IConnection,
) {
  // 1. Join as platform admin and get authorized session
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree (realistic catalog setup, even if not used later)
  const categoryTreeBody = {
    code: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Create Brand A and Brand B
  const brandABody = {
    name: `Brand-A-${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-a-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo/brand-a.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandA: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandABody,
    });
  typia.assert<IShoppingMallBrand>(brandA);

  const brandBBody = {
    name: `Brand-B-${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-b-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo/brand-b.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandB: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBBody,
    });
  typia.assert<IShoppingMallBrand>(brandB);

  // 4. Create an initial product associated with Brand A
  // NOTE: We don't have a seller creation API here, so we rely on typia.random
  // to generate a valid seller id for shopping_mall_seller_id.
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;

  const createProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandA.id,
    code: productCode,
    name: `Product-${RandomGenerator.paragraph({ sentences: 1 })}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "draft",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product/primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const originalProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: createProductBody,
      },
    );
  typia.assert<IShoppingMallProduct>(originalProduct);

  // 5. Update product: change brand to Brand B and status to active, also
  // modify description.
  const updatedStatus = "active";
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });

  const updateBody = {
    status: updatedStatus,
    brandId: brandB.id,
    description: updatedDescription,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.update(
      connection,
      {
        productCode: originalProduct.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallProduct>(updatedProduct);

  // 6. Assertions
  // Immutable fields should remain the same
  TestValidator.equals(
    "product id must remain unchanged after update",
    updatedProduct.id,
    originalProduct.id,
  );

  TestValidator.equals(
    "product code must remain unchanged after update",
    updatedProduct.code,
    originalProduct.code,
  );

  TestValidator.equals(
    "seller summary id must remain unchanged after update",
    updatedProduct.seller.id,
    originalProduct.seller.id,
  );

  TestValidator.equals(
    "seller summary email must remain unchanged after update",
    updatedProduct.seller.email,
    originalProduct.seller.email,
  );

  TestValidator.equals(
    "seller summary store_name must remain unchanged after update",
    updatedProduct.seller.store_name,
    originalProduct.seller.store_name,
  );

  TestValidator.equals(
    "seller summary status must remain unchanged after update",
    updatedProduct.seller.status,
    originalProduct.seller.status,
  );

  // Brand should now reference Brand B
  TestValidator.predicate(
    "updated product should have non-null brand summary",
    updatedProduct.brand !== null && updatedProduct.brand !== undefined,
  );

  if (updatedProduct.brand !== null && updatedProduct.brand !== undefined) {
    TestValidator.equals(
      "updated product brand id must match Brand B id",
      updatedProduct.brand.id,
      brandB.id,
    );

    TestValidator.equals(
      "updated product brand name must match Brand B name",
      updatedProduct.brand.name,
      brandB.name,
    );

    TestValidator.equals(
      "updated product brand slug must match Brand B slug",
      updatedProduct.brand.slug,
      brandB.slug,
    );
  }

  // Status and description should match update payload
  TestValidator.equals(
    "updated product status must match requested status",
    updatedProduct.status,
    updatedStatus,
  );

  TestValidator.equals(
    "updated product description must match requested description",
    updatedProduct.description,
    updatedDescription,
  );

  // Ensure that something actually changed compared to original product
  TestValidator.notEquals(
    "updated product must differ from original product in brand or status",
    {
      status: updatedProduct.status,
      brandId: updatedProduct.brand ? updatedProduct.brand.id : null,
      description: updatedProduct.description,
    },
    {
      status: originalProduct.status,
      brandId: originalProduct.brand ? originalProduct.brand.id : null,
      description: originalProduct.description,
    },
  );
}
