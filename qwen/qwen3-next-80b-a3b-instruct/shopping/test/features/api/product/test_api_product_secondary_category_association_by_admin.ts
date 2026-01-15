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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_secondary_category_association_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
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
  // Step 2: Generate a random product ID (assuming product exists or is created externally)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Generate two valid secondary category IDs
  const categoryIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    2,
    () => typia.random<string & tags.Format<"uuid">>(),
  );
  // Step 4: Associate the secondary categories with the product
  const result: IShoppingMallProduct.ISecCatAssociateResult =
    await api.functional.shoppingMall.admin.products.secondary_categories.associate(
      adminConnection,
      {
        productId,
        body: {
          category_ids: categoryIds,
        } satisfies IShoppingMallProduct.ISecCatAssociate,
      },
    );
  typia.assert(result);
  // Step 5: Validate that the association returns a successful result
  // Since ISecCatAssociateResult is an empty object, we validate that the operation succeeded
  // with no errors and that the response is properly typed and structured
  TestValidator.equals(
    "secondary category association returns valid result",
    true,
    result !== null,
  );
}
