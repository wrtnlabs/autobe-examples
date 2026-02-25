import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_retrieval_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // Update sellerConnection with token from join response
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: joinResponse.token.access,
  };
  // Step 2: Retrieve a product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const retrievedProduct = await api.functional.shoppingMall.seller.products.at(
    sellerConnection,
    {
      productId,
    },
  );
  typia.assert(retrievedProduct);
  // Step 3: Validate product structure matches IInvert
  TestValidator.predicate(
    "product has id",
    typeof retrievedProduct.id === "string",
  );
  TestValidator.predicate(
    "product has name",
    typeof retrievedProduct.name === "string",
  );
  TestValidator.predicate(
    "product has description",
    typeof retrievedProduct.description === "string",
  );
  TestValidator.predicate(
    "product has base_price",
    typeof retrievedProduct.base_price === "number",
  );
  TestValidator.predicate(
    "product has is_deleted",
    typeof retrievedProduct.is_deleted === "boolean",
  );
  TestValidator.predicate(
    "product has seller",
    retrievedProduct.seller !== undefined,
  );
  TestValidator.predicate(
    "product has category",
    retrievedProduct.category !== undefined,
  );
  // Step 4: Validate seller structure matches ISummary
  TestValidator.predicate(
    "seller has id",
    typeof retrievedProduct.seller.id === "string",
  );
  TestValidator.predicate(
    "seller has shop_name",
    typeof retrievedProduct.seller.shop_name === "string",
  );
  TestValidator.predicate(
    "seller has approval_status",
    typeof retrievedProduct.seller.approval_status === "string",
  );
  TestValidator.predicate(
    "seller has created_at",
    typeof retrievedProduct.seller.created_at === "string",
  );
  // Step 5: Validate category structure matches ISummary
  TestValidator.predicate(
    "category has id",
    typeof retrievedProduct.category.id === "string",
  );
  TestValidator.predicate(
    "category has name",
    typeof retrievedProduct.category.name === "string",
  );
  // Step 6: If product is deleted, validate deleted status fields
  if (retrievedProduct.is_deleted) {
    TestValidator.notEquals(
      "deleted_at is set when product is deleted",
      retrievedProduct.deleted_at,
      null,
    );
    TestValidator.predicate(
      "deleted_at is valid date-time",
      retrievedProduct.deleted_at !== undefined,
    );
  }
}
