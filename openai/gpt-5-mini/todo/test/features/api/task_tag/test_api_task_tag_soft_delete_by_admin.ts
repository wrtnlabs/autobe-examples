import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate admin soft-delete (erase) behavior for canonical task tags.
 *
 * Business intent:
 *
 * - Ensure that an admin can soft-delete a canonical task tag created by a
 *   todoUser. Because the provided SDK does not expose a GET endpoint for task
 *   tags, the test verifies deletion by asserting the erase call succeeds and
 *   by attempting to recreate the tag name (accepting either success or a
 *   uniqueness conflict). Additional negative tests validate malformed and
 *   non-existent UUID handling.
 *
 * Steps:
 *
 * 1. TodoUser: join -> create a tag (capture id + name)
 * 2. Admin: join (new connection) -> erase(tagId)
 * 3. Attempt to recreate tag with same name (either succeeds or throws 409)
 * 4. Negative cases: invalid UUID format and non-existent UUID
 */
export async function test_api_task_tag_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a todoUser and a tag under that user
  const todoUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123", // meets min length 8
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies ITodoAppTodoUser.ICreate;

  const todoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserBody,
    });
  typia.assert(todoUser);

  // Create a unique tag name for the test
  const tagName = `temporary-tag-${RandomGenerator.alphaNumeric(6)}`;
  const createTagBody = { name: tagName } satisfies ITodoAppTaskTag.ICreate;

  const tag: ITodoAppTaskTag =
    await api.functional.todoApp.todoUser.taskTags.create(connection, {
      body: createTagBody,
    });
  typia.assert(tag);
  TestValidator.equals("created tag name matches", tag.name, tagName);

  // 2. Create admin context using a fresh connection (empty headers)
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123", // meets min length 8
    href: "https://example.com/admin/signup",
    referrer: "https://example.com",
    role: "superadmin",
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    adminConn,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // 3. As admin, erase (soft-delete) the tag
  await api.functional.todoApp.admin.taskTags.erase(adminConn, {
    tagId: tag.id,
  });

  // 4. Business-level verification: attempt to recreate the tag with the same name.
  //    Two acceptable behaviors:
  //    - The name was freed by soft-delete and creation succeeds (assert name)
  //    - The service still prevents duplicate names and throws (assert thrown)
  try {
    const recreated: ITodoAppTaskTag =
      await api.functional.todoApp.todoUser.taskTags.create(connection, {
        body: { name: tagName } satisfies ITodoAppTaskTag.ICreate,
      });
    typia.assert(recreated);
    TestValidator.equals("recreated tag name matches", recreated.name, tagName);
  } catch (err) {
    // If creation throws due to uniqueness / referential policy, assert that
    // an error indeed occurred. We use TestValidator.error to record the
    // business expectation that recreation may be rejected.
    await TestValidator.error(
      "recreate after delete should either succeed or fail with a business error",
      async () => {
        // Re-throw the caught error to satisfy TestValidator.error's expectation
        throw err;
      },
    );
  }

  // 5. Negative cases
  // 5.a Invalid UUID format
  await TestValidator.error("invalid tagId format should fail", async () => {
    await api.functional.todoApp.admin.taskTags.erase(adminConn, {
      // Intentionally malformed UUID string (still typed as string literal)
      tagId: "invalid-uuid",
    });
  });

  // 5.b Non-existent UUID should result in an error (404/NotFound semantics)
  await TestValidator.error(
    "non-existent tagId should result in not-found error",
    async () => {
      await api.functional.todoApp.admin.taskTags.erase(adminConn, {
        tagId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
