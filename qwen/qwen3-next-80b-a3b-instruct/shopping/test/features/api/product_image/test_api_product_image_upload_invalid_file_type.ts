import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_product_image_upload_invalid_file_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Step 2: Create a product to host the images using utility function
  const productConnection: api.IConnection = { host: connection.host };
  productConnection.headers = { Authorization: sellerAuth.token.access };
  // Use the generator function to create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    productConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  // Assert that product actually has an id property (even though IShoppingMallProduct is empty)
  // This is a common pattern: type is more restrictive than runtime object
  const productWithId = product as IShoppingMallProduct & {
    id: string;
  };
  // Step 3: Use the image upload generator to test invalid file types: .exe, .pdf, .gif
  // Invalid file types: .exe (executable), .pdf (document), .gif (animated image) - these should be rejected
  const invalidExtensions = [
    {
      name: "malicious",
      extension: "exe",
      url: "https://example.com/malicious.exe",
    },
    {
      name: "document",
      extension: "pdf",
      url: "https://example.com/document.pdf",
    },
    {
      name: "animation",
      extension: "gif",
      url: "https://example.com/animation.gif",
    },
  ];
  // Use the PRE-GENERATED utility function which already handles product ID internally
  for (const invalidFile of invalidExtensions) {
    await TestValidator.error(
      `should reject file type with extension ${invalidFile.extension}`,
      async () => {
        await generate_random_shopping_mall_seller_products_images_create(
          productConnection,
          {
            params: { productId: productWithId.id },
            body: {
              name: invalidFile.name,
              extension: invalidFile.extension,
              url: invalidFile.url,
            },
          },
        );
      },
    );
  }
}
