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

export async function test_api_category_browsing_sort_updated_at_direction(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody =
    typia.random<IShoppingMallAdmin.IJoin>() satisfies IShoppingMallAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const page = 1 satisfies IShoppingMallCategory.IRequest["page"];
  const limit = 20 satisfies IShoppingMallCategory.IRequest["limit"];
  const requestDesc = {
    page,
    limit,
    sortBy: "updated_at" as const,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallCategory.IRequest;
  const pageDesc = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    { body: requestDesc },
  );
  typia.assert(pageDesc);
  const dataDesc = pageDesc.data;
  for (let i = 0; i < dataDesc.length; i++) {
    TestValidator.equals(
      "category not deleted (deleted_at is null)",
      dataDesc[i].deleted_at,
      null,
    );
    if (i + 1 < dataDesc.length) {
      const current = new Date(dataDesc[i].updated_at).getTime();
      const next = new Date(dataDesc[i + 1].updated_at).getTime();
      TestValidator.predicate(
        `adjacent updated_at descending check at index ${i}`,
        next <= current,
      );
    }
  }
  const requestAsc = {
    ...requestDesc,
    sortDirection: "asc" as const,
  } satisfies IShoppingMallCategory.IRequest;
  const pageAsc = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    { body: requestAsc },
  );
  typia.assert(pageAsc);
  const dataAsc = pageAsc.data;
  for (let i = 0; i < dataAsc.length; i++) {
    TestValidator.equals(
      "category not deleted (deleted_at is null)",
      dataAsc[i].deleted_at,
      null,
    );
    if (i + 1 < dataAsc.length) {
      const current = new Date(dataAsc[i].updated_at).getTime();
      const next = new Date(dataAsc[i + 1].updated_at).getTime();
      TestValidator.predicate(
        `adjacent updated_at ascending check at index ${i}`,
        next >= current,
      );
    }
  }
}
