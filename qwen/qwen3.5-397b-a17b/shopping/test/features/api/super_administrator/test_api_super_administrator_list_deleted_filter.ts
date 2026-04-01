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

export async function test_api_super_administrator_list_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple super administrator accounts for testing
  const superAdmin1 = await authorize_super_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin1);
  const superAdmin2 = await authorize_super_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin2);
  const superAdmin3 = await authorize_super_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin3);
  // 2. Test listing with deleted=false (active accounts only)
  const activeList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          deleted: false,
          limit: 100,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(activeList);
  // Verify all returned accounts have deleted_at as null (active)
  TestValidator.predicate("all active accounts have null deleted_at", () =>
    activeList.data.every((admin) => admin.deleted_at === null),
  );
  // Verify our created admins are in the active list
  const activeIds = activeList.data.map((admin) => admin.id);
  TestValidator.predicate("superAdmin1 is in active list", () =>
    activeIds.includes(superAdmin1.id),
  );
  TestValidator.predicate("superAdmin2 is in active list", () =>
    activeIds.includes(superAdmin2.id),
  );
  TestValidator.predicate("superAdmin3 is in active list", () =>
    activeIds.includes(superAdmin3.id),
  );
  // 3. Test listing with deleted=true (should return empty when no deleted accounts)
  const deletedList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          deleted: true,
          limit: 100,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(deletedList);
  // Since we haven't deleted any accounts, this should return empty or only pre-existing deleted accounts
  TestValidator.predicate(
    "deleted list pagination is valid",
    () => deletedList.pagination.records >= 0,
  );
  // Verify all returned accounts have deleted_at not null (deleted)
  TestValidator.predicate("all deleted accounts have non-null deleted_at", () =>
    deletedList.data.every((admin) => admin.deleted_at !== null),
  );
  // 4. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Filter by created_at_from (accounts created after yesterday)
  const dateFromList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          created_at_from: yesterday.toISOString(),
          deleted: false,
          limit: 100,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(dateFromList);
  // Verify all returned accounts were created after the from date
  TestValidator.predicate("all accounts created after from date", () =>
    dateFromList.data.every(
      (admin) => new Date(admin.created_at).getTime() >= yesterday.getTime(),
    ),
  );
  // Filter by created_at_to (accounts created before tomorrow)
  const dateToList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          created_at_to: tomorrow.toISOString(),
          deleted: false,
          limit: 100,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(dateToList);
  // Verify all returned accounts were created before the to date
  TestValidator.predicate("all accounts created before to date", () =>
    dateToList.data.every(
      (admin) => new Date(admin.created_at).getTime() <= tomorrow.getTime(),
    ),
  );
  // 5. Test combined filters (search + deleted + date range + sorting)
  const searchEmail = superAdmin1.email.split("@")[0];
  const combinedList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          search: searchEmail,
          deleted: false,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          sort: "created_at",
          direction: "desc",
          limit: 10,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(combinedList);
  // Verify search results contain the searched email
  TestValidator.predicate("search results contain matching email", () =>
    combinedList.data.some((admin) => admin.email.includes(searchEmail)),
  );
  // Verify all results are active (deleted_at is null)
  TestValidator.predicate("combined filter results are all active", () =>
    combinedList.data.every((admin) => admin.deleted_at === null),
  );
  // 6. Test sorting
  const sortedList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          deleted: false,
          sort: "email",
          direction: "asc",
          limit: 100,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(sortedList);
  // Verify emails are sorted in ascending order
  TestValidator.predicate("emails are sorted ascending", () => {
    for (let i = 1; i < sortedList.data.length; i++) {
      if (sortedList.data[i - 1].email > sortedList.data[i].email) {
        return false;
      }
    }
    return true;
  });
  // 7. Test pagination
  const paginatedList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          deleted: false,
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(paginatedList);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedList.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count valid",
    () => paginatedList.pagination.records >= paginatedList.data.length,
  );
  // 8. Test omitted deleted parameter (should default to active accounts)
  const defaultList =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      {
        host: connection.host,
        headers: { Authorization: superAdmin1.token.access },
      },
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(defaultList);
  // Verify default behavior returns active accounts (deleted_at is null)
  TestValidator.predicate("default list shows active accounts", () =>
    defaultList.data.every((admin) => admin.deleted_at === null),
  );
}
