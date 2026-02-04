import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_images_reorder_invalid_missing_image(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Step 3: Create category using admin connection
  const category: IShoppingMallSection =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // Step 4: Create product using seller connection
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  // We know the product must have an id field for subsequent operations to work
  // Use typia.assert to assert it exists even if the schema definition is incomplete
  const productWithId = typia.assert<
    IShoppingMallProduct & {
      id: string;
    }
  >(product);
  // Step 5: Upload multiple images to product
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          name: "image1",
          extension: "jpg",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
        params: {
          productId: productWithId.id,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          name: "image2",
          extension: "png",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
        params: {
          productId: productWithId.id,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          name: "image3",
          extension: "webp",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallProductImage.ICreate,
        params: {
          productId: productWithId.id,
        },
      },
    );
  typia.assert(image3);
  // Step 6: Attempt to reorder images but omit one (simulate invalid request)
  // Create reorder request for only two images, omitting image3
  const reorderInput: any = {
    value: [
      {
        imageId: image1.imageId,
        imageOrder: 0,
      },
      {
        imageId: image2.imageId,
        imageOrder: 1,
      },
      // image3 is intentionally omitted
    ],
  };
  // Step 7: Validate that reordering fails with 400 error due to missing images
  await TestValidator.error(
    "reordering should fail when images are missing from request",
    async () => {
      await api.functional.shoppingMall.seller.products.images.reorder(
        sellerConnection,
        {
          productId: productWithId.id,
          body: reorderInput,
        },
      );
    },
  );
}
