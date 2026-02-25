import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_category_retrieve_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Unauthorized retrieval attempt
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Use a valid UUID for product category id
  const validUuid = typia.random<string & tags.Format<"uuid">>();
  // Expect the call to throw an HTTP 401 Unauthorized error
  await TestValidator.httpError(
    "unauthorized access to product category",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.product_categories.at(
        anonymousConnection,
        { categoryCategoryId: validUuid },
      );
    },
  );
}
