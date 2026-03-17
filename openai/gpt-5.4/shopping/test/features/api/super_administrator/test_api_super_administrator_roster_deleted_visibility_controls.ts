import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_roster_deleted_visibility_controls(
  connection: api.IConnection,
): Promise<void> {
  const governanceConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
  };
  const allowedKeys = [
    "id",
    "email",
    "active",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const page = 1;
  const limit = 10;
  const ordinaryRequest = {
    page,
    limit,
  } satisfies IShoppingMallSuperAdministrator.IRequest;
  const ordinary = await api.functional.shoppingMall.superAdministrators.index(
    governanceConnection,
    {
      body: ordinaryRequest,
    },
  );
  typia.assert(ordinary);
  typia.assert<IPage.IPagination>(ordinary.pagination);
  TestValidator.equals(
    "ordinary browsing current page",
    ordinary.pagination.current,
    ordinaryRequest.page,
  );
  TestValidator.equals(
    "ordinary browsing page limit",
    ordinary.pagination.limit,
    ordinaryRequest.limit,
  );
  TestValidator.predicate(
    "ordinary browsing data length within limit",
    ordinary.data.length <= ordinary.pagination.limit,
  );
  TestValidator.predicate(
    "ordinary browsing pages non-negative",
    ordinary.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "ordinary browsing records non-negative",
    ordinary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "ordinary browsing excludes deleted accounts by default",
    ordinary.data.every(
      (superAdministrator: IShoppingMallSuperAdministrator.ISummary) =>
        superAdministrator.deleted_at === null,
    ),
  );
  ordinary.data.forEach(
    (superAdministrator: IShoppingMallSuperAdministrator.ISummary) => {
      typia.assert<IShoppingMallSuperAdministrator.ISummary>(
        superAdministrator,
      );
      TestValidator.predicate(
        "ordinary browsing summary keys remain limited",
        Object.keys(superAdministrator).every((key: string) =>
          allowedKeys.includes(key),
        ),
      );
    },
  );
  const includeDeletedRequest = {
    page,
    limit,
    includeDeleted: true,
  } satisfies IShoppingMallSuperAdministrator.IRequest;
  const includeDeleted =
    await api.functional.shoppingMall.superAdministrators.index(
      governanceConnection,
      {
        body: includeDeletedRequest,
      },
    );
  typia.assert(includeDeleted);
  typia.assert<IPage.IPagination>(includeDeleted.pagination);
  TestValidator.equals(
    "includeDeleted browsing current page",
    includeDeleted.pagination.current,
    includeDeletedRequest.page,
  );
  TestValidator.equals(
    "includeDeleted browsing page limit",
    includeDeleted.pagination.limit,
    includeDeletedRequest.limit,
  );
  TestValidator.predicate(
    "includeDeleted browsing data length within limit",
    includeDeleted.data.length <= includeDeleted.pagination.limit,
  );
  TestValidator.predicate(
    "includeDeleted browsing pages non-negative",
    includeDeleted.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "includeDeleted browsing records non-negative",
    includeDeleted.pagination.records >= 0,
  );
  includeDeleted.data.forEach(
    (superAdministrator: IShoppingMallSuperAdministrator.ISummary) => {
      typia.assert<IShoppingMallSuperAdministrator.ISummary>(
        superAdministrator,
      );
      TestValidator.predicate(
        "includeDeleted browsing summary keys remain limited",
        Object.keys(superAdministrator).every((key: string) =>
          allowedKeys.includes(key),
        ),
      );
    },
  );
  if (
    includeDeleted.data.some(
      (superAdministrator: IShoppingMallSuperAdministrator.ISummary) =>
        superAdministrator.deleted_at !== null,
    )
  ) {
    TestValidator.predicate(
      "includeDeleted browsing distinguishes deleted entries by deleted_at",
      includeDeleted.data.some(
        (superAdministrator: IShoppingMallSuperAdministrator.ISummary) =>
          superAdministrator.deleted_at !== null,
      ),
    );
  }
  const deletedOnlyRequest = {
    page,
    limit,
    deletedOnly: true,
  } satisfies IShoppingMallSuperAdministrator.IRequest;
  const deletedOnly =
    await api.functional.shoppingMall.superAdministrators.index(
      governanceConnection,
      {
        body: deletedOnlyRequest,
      },
    );
  typia.assert(deletedOnly);
  typia.assert<IPage.IPagination>(deletedOnly.pagination);
  TestValidator.equals(
    "deletedOnly browsing current page",
    deletedOnly.pagination.current,
    deletedOnlyRequest.page,
  );
  TestValidator.equals(
    "deletedOnly browsing page limit",
    deletedOnly.pagination.limit,
    deletedOnlyRequest.limit,
  );
  TestValidator.predicate(
    "deletedOnly browsing data length within limit",
    deletedOnly.data.length <= deletedOnly.pagination.limit,
  );
  TestValidator.predicate(
    "deletedOnly browsing pages non-negative",
    deletedOnly.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "deletedOnly browsing records non-negative",
    deletedOnly.pagination.records >= 0,
  );
  TestValidator.predicate(
    "deletedOnly browsing returns only soft-deleted accounts",
    deletedOnly.data.every(
      (superAdministrator: IShoppingMallSuperAdministrator.ISummary) =>
        superAdministrator.deleted_at !== null,
    ),
  );
  deletedOnly.data.forEach(
    (superAdministrator: IShoppingMallSuperAdministrator.ISummary) => {
      typia.assert<IShoppingMallSuperAdministrator.ISummary>(
        superAdministrator,
      );
      TestValidator.predicate(
        "deletedOnly browsing summary keys remain limited",
        Object.keys(superAdministrator).every((key: string) =>
          allowedKeys.includes(key),
        ),
      );
    },
  );
}
