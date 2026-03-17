import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_list_paginated_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the primary super admin and obtain authenticated connection
  const primaryConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(primaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register 3 additional super admins to populate the list
  await ArrayUtil.asyncRepeat(3, async () => {
    const extraConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(extraConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // 3. Call with empty body - verify default pagination
  const defaultResult =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      primaryConnection,
      {
        body: {} satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Verify default pagination values
  TestValidator.equals(
    "default current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResult.pagination.limit, 20);
  TestValidator.predicate(
    "records at least 4",
    defaultResult.pagination.records >= 4,
  );
  TestValidator.predicate("data is non-empty", defaultResult.data.length > 0);
  // 4. Pagination test: page 1, limit 2
  const page1Body = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallSuperAdmin.IRequest;
  const page1Result =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      primaryConnection,
      { body: page1Body },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  TestValidator.predicate(
    "page 1 pages computed correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / 2),
  );
  // 5. Pagination test: page 2, limit 2
  const page2Body = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallSuperAdmin.IRequest;
  const page2Result =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      primaryConnection,
      { body: page2Body },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // Records count stays consistent across pages
  TestValidator.equals(
    "records consistent between pages",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  // Page 2 should have data (since we have at least 4 records)
  TestValidator.predicate("page 2 has data", page2Result.data.length > 0);
  // Page 1 and page 2 should return different records
  const page1Ids = new Set(page1Result.data.map((item) => item.id));
  TestValidator.predicate(
    "page 1 and page 2 have different records",
    page2Result.data.every((item) => !page1Ids.has(item.id)),
  );
  // 6. Sort test: sort by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      primaryConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  // Verify ascending order by createdAt
  const createdAtValues = sortByCreatedAtAsc.data.map((item) => item.createdAt);
  for (let i = 1; i < createdAtValues.length; i++) {
    TestValidator.predicate(
      "created_at ascending order",
      (createdAtValues[i] as string) >= (createdAtValues[i - 1] as string),
    );
  }
  // 7. Sort test: sort by email descending
  const sortByEmailDesc =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      primaryConnection,
      {
        body: {
          sort: "email",
          order: "desc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(sortByEmailDesc);
  // Verify descending order by email
  const emailValues = sortByEmailDesc.data.map((item) => item.email);
  for (let i = 1; i < emailValues.length; i++) {
    TestValidator.predicate(
      "email descending order",
      (emailValues[i] as string) <= (emailValues[i - 1] as string),
    );
  }
  // 8. Empty result test: email that matches no accounts
  const noMatchResult =
    await api.functional.shoppingMall.superAdmin.superAdmins.index(
      primaryConnection,
      {
        body: {
          email: "nonexistent_xyz_12345@nowhere-domain-that-does-not-exist.com",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals("no match data empty", noMatchResult.data.length, 0);
  TestValidator.equals(
    "no match records 0",
    noMatchResult.pagination.records,
    0,
  );
}
