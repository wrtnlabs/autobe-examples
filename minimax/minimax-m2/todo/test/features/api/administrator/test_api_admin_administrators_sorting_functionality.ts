import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_administrators_sorting_functionality(
  connection: api.IConnection,
) {
  // Create multiple admin accounts with different names and characteristics for sorting tests
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: "admin1@example.com",
      password_hash: "hashed_password_1",
      first_name: "Alice",
      last_name: "Johnson",
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin1);

  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: "admin2@example.com",
      password_hash: "hashed_password_2",
      first_name: "Bob",
      last_name: "Williams",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin2);

  const admin3 = await api.functional.auth.admin.join(connection, {
    body: {
      email: "admin3@example.com",
      password_hash: "hashed_password_3",
      first_name: "Charlie",
      last_name: "Brown",
      role_level: "moderator",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin3);

  const admin4 = await api.functional.auth.admin.join(connection, {
    body: {
      email: "admin4@example.com",
      password_hash: "hashed_password_4",
      first_name: "Diana",
      last_name: "Davis",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin4);

  // Test sorting by first_name in ascending order
  const sortedByFirstNameAsc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "first_name",
        order_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByFirstNameAsc);

  TestValidator.equals(
    "first_name ascending order",
    sortedByFirstNameAsc.data[0].first_name,
    "Alice",
  );
  TestValidator.equals(
    "first_name ascending order second",
    sortedByFirstNameAsc.data[1].first_name,
    "Bob",
  );
  TestValidator.equals(
    "first_name ascending order third",
    sortedByFirstNameAsc.data[2].first_name,
    "Charlie",
  );
  TestValidator.equals(
    "first_name ascending order fourth",
    sortedByFirstNameAsc.data[3].first_name,
    "Diana",
  );

  // Test sorting by first_name in descending order
  const sortedByFirstNameDesc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "first_name",
        order_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByFirstNameDesc);

  TestValidator.equals(
    "first_name descending order",
    sortedByFirstNameDesc.data[0].first_name,
    "Diana",
  );
  TestValidator.equals(
    "first_name descending order second",
    sortedByFirstNameDesc.data[1].first_name,
    "Charlie",
  );
  TestValidator.equals(
    "first_name descending order third",
    sortedByFirstNameDesc.data[2].first_name,
    "Bob",
  );
  TestValidator.equals(
    "first_name descending order fourth",
    sortedByFirstNameDesc.data[3].first_name,
    "Alice",
  );

  // Test sorting by last_name in ascending order
  const sortedByLastNameAsc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "last_name",
        order_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByLastNameAsc);

  TestValidator.equals(
    "last_name ascending order",
    sortedByLastNameAsc.data[0].last_name,
    "Brown",
  );
  TestValidator.equals(
    "last_name ascending order second",
    sortedByLastNameAsc.data[1].last_name,
    "Davis",
  );
  TestValidator.equals(
    "last_name ascending order third",
    sortedByLastNameAsc.data[2].last_name,
    "Johnson",
  );
  TestValidator.equals(
    "last_name ascending order fourth",
    sortedByLastNameAsc.data[3].last_name,
    "Williams",
  );

  // Test sorting by last_name in descending order
  const sortedByLastNameDesc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "last_name",
        order_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByLastNameDesc);

  TestValidator.equals(
    "last_name descending order",
    sortedByLastNameDesc.data[0].last_name,
    "Williams",
  );
  TestValidator.equals(
    "last_name descending order second",
    sortedByLastNameDesc.data[1].last_name,
    "Johnson",
  );
  TestValidator.equals(
    "last_name descending order third",
    sortedByLastNameDesc.data[2].last_name,
    "Davis",
  );
  TestValidator.equals(
    "last_name descending order fourth",
    sortedByLastNameDesc.data[3].last_name,
    "Brown",
  );

  // Test sorting by email in ascending order
  const sortedByEmailAsc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "email",
        order_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByEmailAsc);

  TestValidator.equals(
    "email ascending order",
    sortedByEmailAsc.data[0].email,
    "admin1@example.com",
  );
  TestValidator.equals(
    "email ascending order second",
    sortedByEmailAsc.data[1].email,
    "admin2@example.com",
  );
  TestValidator.equals(
    "email ascending order third",
    sortedByEmailAsc.data[2].email,
    "admin3@example.com",
  );
  TestValidator.equals(
    "email ascending order fourth",
    sortedByEmailAsc.data[3].email,
    "admin4@example.com",
  );

  // Test sorting by email in descending order
  const sortedByEmailDesc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "email",
        order_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByEmailDesc);

  TestValidator.equals(
    "email descending order",
    sortedByEmailDesc.data[0].email,
    "admin4@example.com",
  );
  TestValidator.equals(
    "email descending order second",
    sortedByEmailDesc.data[1].email,
    "admin3@example.com",
  );
  TestValidator.equals(
    "email descending order third",
    sortedByEmailDesc.data[2].email,
    "admin2@example.com",
  );
  TestValidator.equals(
    "email descending order fourth",
    sortedByEmailDesc.data[3].email,
    "admin1@example.com",
  );

  // Test sorting by role_level in ascending order
  const sortedByRoleLevelAsc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "role_level",
        order_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByRoleLevelAsc);

  // Verify admin role appears before moderator, and super_admin appears last (alphabetical sorting)
  TestValidator.predicate("admin role appears before moderator", () => {
    const adminIndex = sortedByRoleLevelAsc.data.findIndex(
      (a) => a.role_level === "admin",
    );
    const moderatorIndex = sortedByRoleLevelAsc.data.findIndex(
      (a) => a.role_level === "moderator",
    );
    return adminIndex < moderatorIndex;
  });

  // Test sorting by role_level in descending order
  const sortedByRoleLevelDesc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "role_level",
        order_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByRoleLevelDesc);

  // Verify super_admin appears first, admin in middle, moderator last (reverse alphabetical)
  TestValidator.predicate("super_admin appears first in descending", () => {
    return sortedByRoleLevelDesc.data[0].role_level === "super_admin";
  });
  TestValidator.predicate("moderator appears last in descending", () => {
    return (
      sortedByRoleLevelDesc.data[sortedByRoleLevelDesc.data.length - 1]
        .role_level === "moderator"
    );
  });

  // Test sorting by created_at (timestamps should be in order of creation)
  const sortedByCreatedAt =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "asc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByCreatedAt);

  // Verify results are sorted by creation time
  TestValidator.predicate("results sorted by created_at ascending", () => {
    for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
      const prev = new Date(sortedByCreatedAt.data[i - 1].created_at).getTime();
      const curr = new Date(sortedByCreatedAt.data[i].created_at).getTime();
      if (prev > curr) return false;
    }
    return true;
  });

  // Test sorting by created_at in descending order
  const sortedByCreatedAtDesc =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(sortedByCreatedAtDesc);

  // Verify results are sorted by creation time in reverse
  TestValidator.predicate("results sorted by created_at descending", () => {
    for (let i = 1; i < sortedByCreatedAtDesc.data.length; i++) {
      const prev = new Date(
        sortedByCreatedAtDesc.data[i - 1].created_at,
      ).getTime();
      const curr = new Date(sortedByCreatedAtDesc.data[i].created_at).getTime();
      if (prev < curr) return false;
    }
    return true;
  });
}
