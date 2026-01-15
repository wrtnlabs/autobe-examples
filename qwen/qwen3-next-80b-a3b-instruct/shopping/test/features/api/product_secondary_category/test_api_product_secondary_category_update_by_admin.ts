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
export async function test_api_product_secondary_category_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuthorized);
  // Step 2: Generate a product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Generate a secondary category ID and associate with product
  const secondaryCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const associateResult: IShoppingMallProduct.ISecCatAssociateResult =
    await api.functional.shoppingMall.admin.products.secondary_categories.associate(
      adminConnection,
      {
        productId: productId,
        body: {
          category_ids: [secondaryCategoryId],
        } satisfies IShoppingMallProduct.ISecCatAssociate,
      },
    );
  typia.assert(associateResult);
  // Step 4: Update the secondary category assignment for the product (same category ID)
  const updatedCategory: IShoppingMallProductSecondaryCategory =
    await api.functional.shoppingMall.admin.products.secondary_categories.update(
      adminConnection,
      {
        productId: productId,
        secondaryCategoryId: secondaryCategoryId,
        body: {} satisfies IShoppingMallProductSecondaryCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Step 5: Validate the update was successful
  TestValidator.equals(
    "product_id matches",
    updatedCategory.product_id,
    productId,
  );
  TestValidator.equals(
    "secondary_category_id matches",
    updatedCategory.secondary_category_id,
    secondaryCategoryId,
  );
}
