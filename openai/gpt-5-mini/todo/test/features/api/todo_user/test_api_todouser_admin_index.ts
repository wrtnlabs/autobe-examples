import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouser";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_admin_index(
  connection: api.IConnection,
) {
  // 1) Create admin account (required for admin listing)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        display_name: RandomGenerator.name(),
        role: "superadmin",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2) Create a todoUser account so the listing has at least one user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: userEmail,
        password: "UserPass123!",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(todoUser);

  // Keep created user's id for matching in the listing
  const createdUserId: string = todoUser.id;

  // 3) Call the admin listing endpoint with pagination and a filter
  const pageRequest = {
    page: 1,
    pageSize: 10,
    email: userEmail,
  } satisfies ITodoAppTodoUser.IRequest;

  const pageResult: IPageITodoAppTodouser.ISummary =
    await api.functional.todoApp.admin.todoUsers.index(connection, {
      body: pageRequest,
    });
  typia.assert(pageResult);

  // 4) Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested pageSize",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageResult.pagination.pages >= 0,
  );

  // 5) Ensure data contains the created user (match by id)
  const found = pageResult.data.find((d) => d.id === createdUserId);
  TestValidator.predicate(
    "created user appears in admin listing",
    found !== undefined,
  );

  // 6) Validate sanitized fields are present and sensitive fields are not exposed
  for (const item of pageResult.data) {
    // Required sanitized fields from ITodoAppTodoUser.ISummary: id, createdAt, updatedAt
    TestValidator.predicate(
      "summary item has id",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "summary item has createdAt",
      typeof item.createdAt === "string" && item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "summary item has updatedAt",
      typeof item.updatedAt === "string" && item.updatedAt.length > 0,
    );

    // Optional sanitized properties: displayName and isVerified and status may be present
    TestValidator.predicate(
      "displayName is string or null/undefined",
      item.displayName === null ||
        item.displayName === undefined ||
        typeof item.displayName === "string",
    );
    TestValidator.predicate(
      "isVerified is boolean",
      typeof item.isVerified === "boolean",
    );

    // Ensure sensitive fields are not present in the serialized JSON
    const json = JSON.stringify(item);
    TestValidator.predicate(
      "no password_hash leaked",
      !json.includes("password_hash"),
    );
    TestValidator.predicate(
      "no mfa_secret leaked",
      !json.includes("mfa_secret"),
    );
    TestValidator.predicate(
      "no mfa_backup_codes leaked",
      !json.includes("mfa_backup_codes"),
    );
    TestValidator.predicate(
      "no password_reset_token leaked",
      !json.includes("password_reset_token"),
    );

    // If server included email in the returned summary JSON, assert it matches
    if (json.includes('"email"')) {
      TestValidator.predicate(
        "summary JSON contains created email",
        json.includes(userEmail),
      );
    }
  }
}
