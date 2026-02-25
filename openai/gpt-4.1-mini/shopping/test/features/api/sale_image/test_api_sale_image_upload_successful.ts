import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_images_create_sale_image } from "../../../generate/generate_random_shopping_mall_seller_sales_images_create_sale_image";
import { prepare_random_shopping_mall_sale_image } from "../../../prepare/prepare_random_shopping_mall_sale_image";

export async function test_api_sale_image_upload_successful(
  connection: api.IConnection,
): Promise<void> {
  // Test uploading a new image to a sale by an authenticated seller.
  // Includes verifying auth, path param, request body, and response fields.
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Prepare a valid saleId for upload
  // Since no direct sale creation API is given, we simulate generating a random UUID for saleId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Upload the first sale image with required fields only
  const firstImageBody: IShoppingMallSaleImage.ICreate = {
    imageUrl: `https://example.com/image1_${RandomGenerator.alphaNumeric(8)}.jpg`,
    displayOrder: 1,
  };
  const firstUploaded =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerConnection,
      {
        body: firstImageBody,
        params: { saleId },
      },
    );
  typia.assert(firstUploaded);
  // Validate all mandatory response fields are present
  TestValidator.predicate(
    "firstUploaded has id",
    typeof firstUploaded.id === "string" && firstUploaded.id.length > 0,
  );
  TestValidator.equals(
    "firstUploaded imageUrl",
    firstUploaded.imageUrl,
    firstImageBody.imageUrl,
  );
  TestValidator.equals(
    "firstUploaded displayOrder",
    firstUploaded.displayOrder,
    firstImageBody.displayOrder,
  );
  TestValidator.predicate(
    "firstUploaded createdAt is ISO string",
    typeof firstUploaded.createdAt === "string",
  );
  TestValidator.predicate(
    "firstUploaded updatedAt is ISO string",
    typeof firstUploaded.updatedAt === "string",
  );
  TestValidator.equals(
    "firstUploaded deletedAt is null",
    firstUploaded.deletedAt,
    null,
  );
  // 4. Upload a second sale image with altText provided
  const secondImageBody: IShoppingMallSaleImage.ICreate = {
    imageUrl: `https://example.com/image2_${RandomGenerator.alphaNumeric(8)}.jpg`,
    displayOrder: 2,
    altText: `Alternative text ${RandomGenerator.alphabets(8)}`,
  };
  const secondUploaded =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerConnection,
      {
        body: secondImageBody,
        params: { saleId },
      },
    );
  typia.assert(secondUploaded);
  TestValidator.equals(
    "secondUploaded imageUrl",
    secondUploaded.imageUrl,
    secondImageBody.imageUrl,
  );
  TestValidator.equals(
    "secondUploaded displayOrder",
    secondUploaded.displayOrder,
    secondImageBody.displayOrder,
  );
  TestValidator.equals(
    "secondUploaded altText",
    secondUploaded.altText,
    secondImageBody.altText,
  );
  // 5. Upload a third sale image with explicit null altText
  const thirdImageBody: IShoppingMallSaleImage.ICreate = {
    imageUrl: `https://example.com/image3_${RandomGenerator.alphaNumeric(8)}.jpg`,
    displayOrder: 3,
    altText: null,
  };
  const thirdUploaded =
    await generate_random_shopping_mall_seller_sales_images_create_sale_image(
      sellerConnection,
      {
        body: thirdImageBody,
        params: { saleId },
      },
    );
  typia.assert(thirdUploaded);
  TestValidator.equals(
    "thirdUploaded imageUrl",
    thirdUploaded.imageUrl,
    thirdImageBody.imageUrl,
  );
  TestValidator.equals(
    "thirdUploaded displayOrder",
    thirdUploaded.displayOrder,
    thirdImageBody.displayOrder,
  );
  TestValidator.equals(
    "thirdUploaded altText",
    thirdUploaded.altText,
    thirdImageBody.altText,
  );
}
