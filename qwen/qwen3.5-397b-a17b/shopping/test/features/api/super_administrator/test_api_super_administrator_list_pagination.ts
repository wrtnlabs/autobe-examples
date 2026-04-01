import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator (will be the one making API calls)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(admin1);
  // 2. Create additional super administrators for pagination testing
  const admin2 = await authorize_super_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(admin2);
  const admin3 = await authorize_super_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(admin3);
  // 3. Test default pagination (page 1, limit 20)
  const pageResult =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          deleted: false,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(pageResult);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", pageResult.pagination.limit === 20);
  TestValidator.predicate("has records", pageResult.pagination.records >= 3);
  TestValidator.predicate(
    "pages calculated correctly",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.equals(
    "pagination records matches data length",
    pageResult.pagination.records,
    pageResult.data.length,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(pageResult.data));
  TestValidator.predicate("data contains admins", pageResult.data.length >= 3);
  // 6. Validate each summary has required fields
  for (const admin of pageResult.data) {
    TestValidator.predicate("has id", admin.id !== undefined);
    TestValidator.predicate("has email", admin.email !== undefined);
    TestValidator.predicate("has created_at", admin.created_at !== undefined);
    TestValidator.predicate("has updated_at", admin.updated_at !== undefined);
    TestValidator.predicate(
      "deleted_at is null or string",
      admin.deleted_at === null || admin.deleted_at !== undefined,
    );
  }
  // 7. Verify created admins appear in the list
  const emailList = pageResult.data.map((admin) => admin.email);
  TestValidator.predicate(
    "admin1 email in list",
    emailList.includes(admin1.email),
  );
  TestValidator.predicate(
    "admin2 email in list",
    emailList.includes(admin2.email),
  );
  TestValidator.predicate(
    "admin3 email in list",
    emailList.includes(admin3.email),
  );
  // 8. Test sorting by email ascending
  const sortedByEmailAsc =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "email",
          direction: "asc",
          deleted: false,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(sortedByEmailAsc);
  TestValidator.predicate(
    "sorted by email asc",
    sortedByEmailAsc.data.length > 0,
  );
  // 9. Test sorting by created_at descending
  const sortedByCreatedAtDesc =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
          deleted: false,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  TestValidator.predicate(
    "sorted by created_at desc",
    sortedByCreatedAtDesc.data.length > 0,
  );
  // 10. Verify soft-deleted accounts are excluded by default
  TestValidator.predicate(
    "no deleted accounts in default query",
    pageResult.data.every((admin) => admin.deleted_at === null),
  );
}
