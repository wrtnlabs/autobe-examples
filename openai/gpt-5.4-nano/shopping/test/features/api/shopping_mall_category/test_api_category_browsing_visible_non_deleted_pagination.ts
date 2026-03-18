import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_browsing_visible_non_deleted_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2) Browse categories with pagination
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCategory.IRequest;
  const first = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(first);
  const assertNonDeletedAndPagination = (
    page: IPageIShoppingMallCategory.ISummary,
    expectedPage: {
      current: number;
      limit: number;
    },
  ) => {
    TestValidator.equals(
      "current page matches request",
      page.pagination.current,
      expectedPage.current,
    );
    TestValidator.equals(
      "limit matches request",
      page.pagination.limit,
      expectedPage.limit,
    );
    const { records, limit, pages } = page.pagination;
    TestValidator.predicate("records non-negative", records >= 0);
    TestValidator.predicate("pages non-negative", pages >= 0);
    if (records === 0) {
      TestValidator.equals("pages is 0 when records is 0", pages, 0);
      TestValidator.equals(
        "data is empty when records is 0",
        page.data.length,
        0,
      );
    } else {
      const calculatedPages = Math.ceil(records / limit);
      TestValidator.equals(
        "pages equals ceil(records/limit)",
        pages,
        calculatedPages,
      );
    }
    for (const category of page.data) {
      TestValidator.equals(
        "category is not soft-deleted",
        category.deleted_at,
        null,
      );
    }
  };
  assertNonDeletedAndPagination(first, { current: 1, limit: 10 });
  // 3) Repeat shortly after and verify stability
  const second = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(second);
  assertNonDeletedAndPagination(second, { current: 1, limit: 10 });
  TestValidator.equals(
    "pagination records stable",
    second.pagination.records,
    first.pagination.records,
  );
  TestValidator.equals(
    "pagination pages stable",
    second.pagination.pages,
    first.pagination.pages,
  );
  const firstIds = first.data.map((x) => x.id);
  const secondIds = second.data.map((x) => x.id);
  TestValidator.equals("category id list stable", secondIds, firstIds);
}
