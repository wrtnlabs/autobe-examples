import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_admin_browsing_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234", // Plain text password (bcrypt will hash it with cost factor 12)
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Test category browsing with search that returns no results
  // Use a very long random string to ensure no category matches
  const randomSearchString =
    RandomGenerator.alphabets(50) + RandomGenerator.alphaNumeric(30);
  const output: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        search: randomSearchString,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(output);
  // Step 3: Validate pagination metadata for empty results
  TestValidator.equals("page number is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 10", output.pagination.limit, 10);
  TestValidator.equals("records is 0", output.pagination.records, 0);
  TestValidator.equals("pages is 0", output.pagination.pages, 0);
  // Step 4: Validate empty data array
  TestValidator.equals("data array is empty", output.data.length, 0);
  TestValidator.predicate("data array is empty", output.data.length === 0);
}
