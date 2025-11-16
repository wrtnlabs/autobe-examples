import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Confirm admin access to product image list API with pagination and filtering.
 *
 * Steps:
 *
 * 1. Register and authenticate as platform admin
 * 2. Create a new product in the catalog as admin
 * 3. Call the admin product images listing endpoint for the product (no images
 *    expected yet)
 * 4. Exercise pagination and filter options (page, limit, sort_by, sort_order,
 *    label, position)
 * 5. Check that all images belong to the correct product, no leakage from
 *    unrelated products or deleted records
 * 6. Validate image metadata: position, label, association to product, visibility
 *    of all fields
 * 7. Confirm that non-admins cannot access the endpoint (simulate by
 *    unauthenticated call)
 */
export async function test_api_admin_product_images_listing_access_control(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Create a new product in the catalog
  const newProduct = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 5,
          wordMax: 10,
        }),
        default_price: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<999999>
        >(),
        business_status: "draft",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(newProduct);
  // 3. Call admin product images listing endpoint (no images expected)
  const page1 = await api.functional.shoppingMall.admin.products.images.index(
    connection,
    {
      productId: newProduct.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductImage.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "image data array exists and is array",
    Array.isArray(page1.data),
  );
  // 4. Exercise filter & sort options, confirm only images for this product
  // (No images yet, all should be empty arrays)
  for (const [label, position, sortBy, sortOrder] of [
    [undefined, undefined, undefined, undefined],
    [undefined, undefined, "created_at", "desc"],
    ["preview", undefined, undefined, undefined],
    [undefined, 0, "position", "asc"],
  ] as const) {
    const filtered =
      await api.functional.shoppingMall.admin.products.images.index(
        connection,
        {
          productId: newProduct.id,
          body: {
            page: 1,
            limit: 10,
            label,
            position,
            sort_by: sortBy,
            sort_order: sortOrder,
          } satisfies IShoppingMallProductImage.IRequest,
        },
      );
    typia.assert(filtered);
    for (const img of filtered.data) {
      TestValidator.equals(
        "all images have correct product id",
        img.product?.id,
        newProduct.id,
      );
      TestValidator.predicate(
        "image has valid position",
        typeof img.position === "number",
      );
      TestValidator.predicate(
        "image has non-empty cdn_uri",
        typeof img.cdn_uri === "string" && img.cdn_uri.length > 0,
      );
    }
  }
  // 5. Confirm access control: unauthenticated users cannot access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin product images listing",
    async () => {
      await api.functional.shoppingMall.admin.products.images.index(
        unauthConn,
        {
          productId: newProduct.id,
          body: {
            page: 1,
          } satisfies IShoppingMallProductImage.IRequest,
        },
      );
    },
  );
}
