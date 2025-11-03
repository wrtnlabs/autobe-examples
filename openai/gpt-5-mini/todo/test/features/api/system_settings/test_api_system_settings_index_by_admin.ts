import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate admin listing of system settings with pagination, filtering and
 * sorting.
 *
 * Business purpose:
 *
 * - Ensure administrative actor can retrieve paginated system settings using
 *   server-side filters and sorting options.
 * - Validate response shape matches IPageITodoAppSystemSetting.ISummary and each
 *   item contains required summary fields for admin consumption.
 *
 * Steps:
 *
 * 1. Create an admin account via POST /auth/admin/join (ITodoAppAdmin.ICreate)
 * 2. Call PATCH /todoApp/admin/systemSettings with pagination, filter and sorting
 *    parameters (ITodoAppSystemSetting.IRequest)
 * 3. Assert response is a paginated summary and each item has expected fields
 */
export async function test_api_system_settings_index_by_admin(
  connection: api.IConnection,
) {
  // 1) Create an admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "P@ssw0rd123", // satisfies MinLength<8>
    display_name: RandomGenerator.name(),
    role: "superadmin", // allowed values: 'moderator'|'support'|'superadmin'
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // At this point the SDK sets connection.headers.Authorization internally

  // 2) Prepare the system settings search request
  const requestBody = {
    page: 1,
    pageSize: 10,
    key: "site:maintenance",
    // DTO expects camelCase sortBy values: 'createdAt' | 'updatedAt' | 'key'
    sortBy: "createdAt",
    sortOrder: "desc",
    includeDeleted: false,
  } satisfies ITodoAppSystemSetting.IRequest;

  // 3) Call the index endpoint
  const pageResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.admin.systemSettings.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 4) Validate pagination meta
  TestValidator.equals(
    "pagination.current equals requested page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals requested pageSize",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.predicate("data is an array", Array.isArray(pageResult.data));

  // 5) Validate each item in the page data
  for (const item of pageResult.data) {
    // Full structural/type validation
    typia.assert(item);

    // Business-level assertions
    TestValidator.predicate(
      "item has non-empty id",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "item has non-empty key",
      typeof item.key === "string" && item.key.length > 0,
    );

    // Admin callers should receive the 'value' property (may be sensitive),
    // ensure it exists (could be empty string) — we only assert presence, not content
    TestValidator.predicate(
      "value property present for admin",
      item.value !== undefined,
    );

    // description may be nullable
    TestValidator.predicate(
      "description is string or null",
      item.description === null || typeof item.description === "string",
    );

    TestValidator.predicate(
      "isPublic is boolean",
      typeof item.isPublic === "boolean",
    );
    TestValidator.predicate(
      "createdAt is ISO string",
      typeof item.createdAt === "string" && item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt is ISO string",
      typeof item.updatedAt === "string" && item.updatedAt.length > 0,
    );
  }

  // NOTE: Audit side-effect verification skipped - no explicit audit SDK exposed
}
