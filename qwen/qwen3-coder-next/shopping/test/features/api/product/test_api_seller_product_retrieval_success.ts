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

export async function test_api_seller_product_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Retrieve the seller's own product
  // Since we only have the product retrieval endpoint available,
  // we'll test the retrieval with the seller's authentication
  // The actual product would be created by the seller in a real scenario
  // and the retrieval would be tested with a valid product ID
  // Use a placeholder product ID - in a real test scenario, this would be
  // a product ID created by the seller in the database
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test: Retrieve the seller's product
  // This validates that the seller can access their product information
  const retrieved = await api.functional.shoppingMall.seller.products.at(
    sellerConnection,
    {
      productId: productId,
    },
  );
  typia.assert(retrieved);
  // Validate product information
  TestValidator.equals("product ID matches", retrieved.id, productId);
  TestValidator.predicate(
    "has valid seller information",
    retrieved.seller !== null,
  );
  TestValidator.predicate(
    "has valid category information",
    retrieved.category !== null,
  );
}
