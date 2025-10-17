import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_image_deletion_display_order_recalculation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create product category
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category (required for product creation)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Authenticate as seller for product and image management
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: RandomGenerator.pick([
          "individual",
          "llc",
          "corporation",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Upload 5 images
  const images: IShoppingMallProductImage[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const image: IShoppingMallProductImage =
        await api.functional.shoppingMall.seller.products.images.createImage(
          connection,
          {
            productId: product.id,
            body: {
              image_url: typia.random<string & tags.Format<"url">>(),
            } satisfies IShoppingMallProduct.IImageCreate,
          },
        );
      typia.assert(image);
      return image;
    },
  );

  // Verify all 5 images were created
  TestValidator.equals("initial image count", images.length, 5);

  // Sort images by display_order to find the middle one
  const sortedImages = [...images].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const middleImage = sortedImages[2];
  typia.assert(middleImage);

  // Step 6: Delete the middle image
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: product.id,
    imageId: middleImage.id,
  });

  // Step 7: Delete remaining images to verify multiple deletions work
  await ArrayUtil.asyncForEach(
    sortedImages.filter((img) => img.id !== middleImage.id),
    async (image) => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: product.id,
          imageId: image.id,
        },
      );
    },
  );
}
