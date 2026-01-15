import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSecondaryCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSecondaryCategory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_secondary_category_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Generate a random secondary category ID
  const secondaryCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Associate the product with the secondary category
  await api.functional.shoppingMall.admin.products.secondary_categories.associate(
    adminConnection,
    {
      productId,
      body: {
        category_ids: [secondaryCategoryId],
      } satisfies IShoppingMallProduct.ISecCatAssociate,
    },
  );
  // Step 5: Retrieve the specific secondary category association
  const retrieved: IShoppingMallProductSecondaryCategory =
    await api.functional.shoppingMall.products.secondary_categories.at(
      adminConnection,
      {
        productId,
        secondaryCategoryId,
      },
    );
  typia.assert(retrieved);
  // Step 6: Validate that the retrieved data matches expected structure
  TestValidator.equals("product_id matches", retrieved.product_id, productId);
  TestValidator.equals(
    "secondary_category_id matches",
    retrieved.secondary_category_id,
    secondaryCategoryId,
  );
}
