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

export async function test_api_platform_admin_product_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and establish authorized context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a category tree (catalog context). Response is asserted but not used further.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  // 3. Create an initial brand that the first product will use
  const initialBrandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo/brand-initial.png",
  } satisfies IShoppingMallBrand.ICreate;

  const initialBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: initialBrandBody,
    });
  typia.assert<IShoppingMallBrand>(initialBrand);

  // 4. Create a second brand to update the product brand association later
  const updatedBrandBody = {
    name: `Brand ${RandomGenerator.name(1)} (Updated)`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}-updated`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo/brand-updated.png",
  } satisfies IShoppingMallBrand.ICreate;

  const updatedBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: updatedBrandBody,
    });
  typia.assert<IShoppingMallBrand>(updatedBrand);

  // 5. Create an initial product that will be updated
  const productCode: string & tags.MinLength<1> =
    `PROD-${RandomGenerator.alphaNumeric(12)}` as string & tags.MinLength<1>;

  // Use a fixed but syntactically valid UUID for seller id, as no seller-create API exists in this scope.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: initialBrand.id,
    code: productCode,
    name: `Original ${RandomGenerator.name(2)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "draft",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product/original-primary.jpg",
    additional_data: JSON.stringify({ origin: "initial", version: 1 }),
  } satisfies IShoppingMallProduct.ICreate;

  const originalProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: createProductBody },
    );
  typia.assert<IShoppingMallProduct>(originalProduct);

  // Basic invariants on created product
  TestValidator.equals(
    "created product code matches requested code",
    originalProduct.code,
    productCode,
  );
  TestValidator.equals(
    "created product seller id matches requested seller id",
    originalProduct.seller.id,
    sellerId,
  );
  if (originalProduct.brand !== null && originalProduct.brand !== undefined) {
    TestValidator.equals(
      "created product brand id matches initial brand id",
      originalProduct.brand.id,
      initialBrand.id,
    );
  }

  // 6. Prepare update payload for mutable fields
  const updatedName = `Updated ${RandomGenerator.name(2)}`;
  const updatedShortDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedStatus = "active";
  const updatedIsMultiSku = true;
  const updatedPrimaryImageUri =
    "https://cdn.example.com/product/updated-primary.jpg" as string &
      tags.Format<"uri">;
  const updatedAdditionalData = JSON.stringify({
    origin: "update",
    version: 2,
  });

  const updateBody = {
    name: updatedName,
    shortDescription: updatedShortDescription,
    description: updatedDescription,
    status: updatedStatus,
    isMultiSku: updatedIsMultiSku,
    primaryImageUri: updatedPrimaryImageUri,
    brandId: updatedBrand.id,
    additionalData: updatedAdditionalData,
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

  // 7. Validate immutable identity fields remain unchanged
  TestValidator.equals(
    "updated product id remains unchanged",
    updatedProduct.id,
    originalProduct.id,
  );
  TestValidator.equals(
    "updated product code remains unchanged",
    updatedProduct.code,
    originalProduct.code,
  );

  // 8. Validate mutable fields reflect updated values
  TestValidator.equals(
    "product name updated correctly",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "product short description updated correctly",
    updatedProduct.short_description,
    updatedShortDescription,
  );
  TestValidator.equals(
    "product description updated correctly",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product status updated correctly",
    updatedProduct.status,
    updatedStatus,
  );
  TestValidator.equals(
    "product is_multi_sku updated correctly",
    updatedProduct.is_multi_sku,
    updatedIsMultiSku,
  );
  TestValidator.equals(
    "product primary_image_uri updated correctly",
    updatedProduct.primary_image_uri,
    updatedPrimaryImageUri,
  );
  TestValidator.equals(
    "product additional_data updated correctly",
    updatedProduct.additional_data,
    updatedAdditionalData,
  );

  // 9. Validate seller summary still present and unchanged at basic level
  TestValidator.equals(
    "seller id remains unchanged after product update",
    updatedProduct.seller.id,
    originalProduct.seller.id,
  );
  TestValidator.equals(
    "seller email remains unchanged after product update",
    updatedProduct.seller.email,
    originalProduct.seller.email,
  );
  TestValidator.equals(
    "seller store_name remains unchanged after product update",
    updatedProduct.seller.store_name,
    originalProduct.seller.store_name,
  );
  TestValidator.equals(
    "seller status remains unchanged after product update",
    updatedProduct.seller.status,
    originalProduct.seller.status,
  );

  // 10. Validate brand summary updated to match new brand association
  if (updatedProduct.brand !== null && updatedProduct.brand !== undefined) {
    TestValidator.equals(
      "updated product brand id matches updated brand id",
      updatedProduct.brand.id,
      updatedBrand.id,
    );
    TestValidator.equals(
      "updated product brand name matches updated brand name",
      updatedProduct.brand.name,
      updatedBrand.name,
    );
    TestValidator.equals(
      "updated product brand slug matches updated brand slug",
      updatedProduct.brand.slug,
      updatedBrand.slug,
    );
  } else {
    throw new Error(
      "Updated product brand summary is missing after setting brandId in update payload",
    );
  }

  // 11. Optionally, ensure fields not provided in update payload remain unchanged
  // In this scenario, all major mutable fields are updated, so immutable
  // fields have already been checked above. If in the future some fields are
  // intentionally omitted from updateBody, add explicit checks here to confirm
  // they are preserved.
}
