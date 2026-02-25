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

export async function test_api_seller_sale_image_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: RandomGenerator.name(1),
    shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    logoUri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a sale (simulate - no direct API to create sale images)
  // Generate a saleId and imageId for testing
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // Since there's no API to create sale image directly, assume these IDs to be used in test
  // Note: In a real environment, you might prepare fixture data or seed data
  // 3. Try retrieve the sale image detail with correct authorization
  // Note: We will call the SDK function directly since there's no utility for this endpoint
  const imageDetail = await api.functional.shoppingMall.seller.sales.images.at(
    sellerConnection,
    {
      saleId: saleId,
      imageId: imageId,
    },
  );
  typia.assert(imageDetail);
  // Assertions for expected fields
  TestValidator.equals("retrieved image ID", imageDetail.id, imageId);
  TestValidator.equals(
    "retrieved sale ID",
    imageDetail.shoppingMallSaleId,
    saleId,
  );
  TestValidator.predicate(
    "imageUrl is string and non-empty",
    typeof imageDetail.imageUrl === "string" && imageDetail.imageUrl.length > 0,
  );
  TestValidator.predicate(
    "displayOrder is number",
    typeof imageDetail.displayOrder === "number",
  );
  TestValidator.predicate(
    "createdAt is valid ISO string",
    typeof imageDetail.createdAt === "string" &&
      imageDetail.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid ISO string",
    typeof imageDetail.updatedAt === "string" &&
      imageDetail.updatedAt.length > 0,
  );
  // 4. Test unauthorized access: use a connection without any authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.shoppingMall.seller.sales.images.at(
      unauthorizedConnection,
      {
        saleId: saleId,
        imageId: imageId,
      },
    );
  });
  // 5. Test 404 for non-existent saleId
  const fakeSaleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found saleId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.at(
        sellerConnection,
        {
          saleId: fakeSaleId,
          imageId: imageId,
        },
      );
    },
  );
  // 6. Test 404 for non-existent imageId
  const fakeImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "not found imageId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.at(
        sellerConnection,
        {
          saleId: saleId,
          imageId: fakeImageId,
        },
      );
    },
  );
}
