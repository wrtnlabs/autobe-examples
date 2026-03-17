import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_paginated_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new admin account using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(authorized);
  // Store created admin's id and email for validation
  const createdAdminId = authorized.id;
  const createdAdminEmail = authorized.email;
  // 2. Call with empty body (no filters)
  const defaultPage = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(defaultPage);
  // 3. Confirm pagination object has valid non-negative values
  TestValidator.predicate(
    "pagination.current is non-negative",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // 4. Confirm the data array contains at least the newly created admin
  const foundAdmin = defaultPage.data.find(
    (admin) => admin.id === createdAdminId,
  );
  TestValidator.predicate(
    "newly created admin found in list",
    foundAdmin !== undefined,
  );
  // 5. Validate the found admin's fields (business logic, not type checks)
  if (foundAdmin !== undefined) {
    TestValidator.equals(
      "admin email matches",
      foundAdmin.email,
      createdAdminEmail,
    );
    TestValidator.predicate(
      "actor_type is customer or seller",
      foundAdmin.actor_type === "customer" ||
        foundAdmin.actor_type === "seller",
    );
    TestValidator.predicate(
      "grade is regular or super",
      foundAdmin.grade === "regular" || foundAdmin.grade === "super",
    );
    TestValidator.equals(
      "deleted_at is null for active admin",
      foundAdmin.deleted_at,
      null,
    );
  }
  // 7. Call with page: 1, limit: 5 — verify pagination reflects correct limit
  const pagedResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals("limit is 5", pagedResult.pagination.limit, 5);
  TestValidator.equals("current page is 1", pagedResult.pagination.current, 1);
  // 8. Call with sortBy: 'email', sortOrder: 'asc'
  const sortByEmailAsc = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        sortBy: "email",
        sortOrder: "asc",
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(sortByEmailAsc);
  // Verify ascending email order if more than 1 result
  if (sortByEmailAsc.data.length > 1) {
    for (let i = 1; i < sortByEmailAsc.data.length; i++) {
      TestValidator.predicate(
        `email sort asc: item[${i - 1}] <= item[${i}]`,
        sortByEmailAsc.data[i - 1].email.toLowerCase() <=
          sortByEmailAsc.data[i].email.toLowerCase(),
      );
    }
  }
  // 9. Call with sortBy: 'createdAt', sortOrder: 'desc'
  const sortByCreatedAtDesc =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);
  // Verify descending createdAt order if more than 1 result
  if (sortByCreatedAtDesc.data.length > 1) {
    for (let i = 1; i < sortByCreatedAtDesc.data.length; i++) {
      TestValidator.predicate(
        `createdAt sort desc: item[${i - 1}] >= item[${i}]`,
        sortByCreatedAtDesc.data[i - 1].created_at >=
          sortByCreatedAtDesc.data[i].created_at,
      );
    }
  }
}
