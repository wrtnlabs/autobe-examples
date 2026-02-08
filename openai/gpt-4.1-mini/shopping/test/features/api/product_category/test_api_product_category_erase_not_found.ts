import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test attempting to delete a non-existent product category.
   *
   * Steps:
   * 1) Admin joins and logs in to obtain authorization tokens.
   * 2) Use a randomly generated UUID that does not correspond to any existing category as categoryId.
   * 3) Attempt category deletion and verify the system returns an HTTP 404 Not Found error.
   * 4) Assert that no data is altered or deleted erroneously (implied by 404 error).
   * 5) Confirm authorization enforcement against unauthorized users attempting deletion.
   */
  // 1) Admin joins
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  await authorize_administrator_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  // 2) Admin logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginBody = typia.random<IShoppingMallAdministrator.ILogin>();
  const authorized = await authorize_administrator_login(adminLoginConnection, {
    body: adminLoginBody,
  });
  // 3) Create new admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 4) Generate a random UUID for a non-existent category
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 5) Attempt to delete the non-existent category, expect 404 Not Found
  await TestValidator.httpError(
    "delete non-existent product category should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        adminConnection,
        { categoryId: nonExistentCategoryId },
      );
    },
  );
  // 6) Attempt deletion without authorization, expect 401 Unauthorized
  await TestValidator.httpError(
    "unauthorized deletion attempt should return 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        { host: connection.host },
        { categoryId: nonExistentCategoryId },
      );
    },
  );
}
