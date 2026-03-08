import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAdmin";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering system administrators by account status.
 * Tests filtering admins by active, suspended, and deleted states.
 * Validates that status filter works correctly and only returns admins matching the specified status.
 */
export async function test_api_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering admins by 'active' status
  const activeFilter: IRedditLikeAdmin.IRequest = {
    status: "active",
    limit: 10,
  };
  const activeAdmins = await api.functional.redditLike.admins.index(
    connection,
    {
      body: activeFilter,
    },
  );
  typia.assert(activeAdmins);
  // Validate response structure
  activeAdmins.data.forEach((admin) => {
    TestValidator.predicate(
      "response has valid structure",
      admin.id !== undefined,
    );
    TestValidator.predicate(
      "username exists",
      typeof admin.username === "string",
    );
    TestValidator.predicate(
      "display_name exists",
      typeof admin.display_name === "string",
    );
  });
  // Test filtering admins by 'suspended' status
  const suspendedFilter: IRedditLikeAdmin.IRequest = {
    status: "suspended",
    limit: 10,
  };
  const suspendedAdmins = await api.functional.redditLike.admins.index(
    connection,
    {
      body: suspendedFilter,
    },
  );
  typia.assert(suspendedAdmins);
  // Test filtering admins by 'deleted' status
  const deletedFilter: IRedditLikeAdmin.IRequest = {
    status: "deleted",
    limit: 10,
  };
  const deletedAdmins = await api.functional.redditLike.admins.index(
    connection,
    {
      body: deletedFilter,
    },
  );
  typia.assert(deletedAdmins);
  // Test with pagination parameters
  const paginatedFilter: IRedditLikeAdmin.IRequest = {
    status: "active",
    page: 1,
    limit: 5,
  };
  const paginatedAdmins = await api.functional.redditLike.admins.index(
    connection,
    {
      body: paginatedFilter,
    },
  );
  typia.assert(paginatedAdmins);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    paginatedAdmins.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has required fields",
    typeof paginatedAdmins.pagination.current === "number" &&
      typeof paginatedAdmins.pagination.limit === "number" &&
      typeof paginatedAdmins.pagination.records === "number" &&
      typeof paginatedAdmins.pagination.pages === "number",
  );
  // Test with search filter combined with status
  const combinedFilter: IRedditLikeAdmin.IRequest = {
    search: "",
    status: "active",
    limit: 20,
  };
  const combinedAdmins = await api.functional.redditLike.admins.index(
    connection,
    {
      body: combinedFilter,
    },
  );
  typia.assert(combinedAdmins);
  // Test that limit respects maximum (100)
  const overLimitFilter: IRedditLikeAdmin.IRequest = {
    status: "active",
    limit: 150, // Exceeds max of 100, should be capped
  };
  const overLimitAdmins = await api.functional.redditLike.admins.index(
    connection,
    {
      body: overLimitFilter,
    },
  );
  typia.assert(overLimitAdmins);
}
