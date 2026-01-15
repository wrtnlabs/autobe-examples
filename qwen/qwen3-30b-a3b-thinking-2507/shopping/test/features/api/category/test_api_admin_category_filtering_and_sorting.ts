import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_category_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Authenticate admin for category management
  const adminConnection = { host: connection.host } satisfies api.IConnection;
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Trigger categories list with sorting and filtering
  const categories = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: {
        search: "Electronics",
        sortBy: "createdAt",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductCategory.IRequest,
    },
  );
  typia.assert(categories);
  // 3. Validate filtering (contains "Electronics" categories)
  const hasElectronics = categories.data.some((category) =>
    category.name.includes("Electronics"),
  );
  TestValidator.equals(
    "categories with electronics should exist",
    hasElectronics,
    true,
  );
  // 4. Validate sorting by creation date (newest first)
  if (categories.data.length > 1) {
    const first = categories.data[0];
    const second = categories.data[1];
    TestValidator.equals(
      "categories should be sorted by creation date (newest first)",
      new Date(first.created_at) > new Date(second.created_at),
      true,
    );
  }
}
