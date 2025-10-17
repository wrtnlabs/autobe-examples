import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

/**
 * Admin-only topic creation with uniqueness and auth boundary validation.
 *
 * This test verifies that:
 *
 * 1. An administrator can register (join) and obtain an authenticated session.
 * 2. Creating a curated topic with a unique code succeeds and persists fields.
 * 3. Re-creating a topic using the same code fails due to unique constraint.
 * 4. Creating a topic without Authorization fails.
 *
 * Steps
 *
 * 1. Admin join (POST /auth/admin/join) to obtain tokens and authenticated
 *    session.
 * 2. Create a topic (POST /econDiscuss/admin/topics) with a unique code.
 * 3. Attempt to create a duplicate topic with the same code (should fail).
 * 4. Attempt to create a topic without Authorization (should fail).
 */
export async function test_api_topic_admin_creation_success_and_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1) Admin join → obtain an authenticated session (SDK sets Authorization automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Adm_${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a topic with a unique code
  const createBody = {
    code: `topic_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const created = await api.functional.econDiscuss.admin.topics.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(created);

  // Validate persisted fields (business logic): code/name/description match input
  TestValidator.equals(
    "created topic.code equals request code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created topic.name equals request name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created topic.description equals request description",
    created.description,
    createBody.description,
  );

  // 3) Attempt to create another topic with the same code → should error
  const duplicateBody = {
    code: createBody.code, // duplicate code
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEconDiscussTopic.ICreate;
  await TestValidator.error("duplicate code creation should fail", async () => {
    await api.functional.econDiscuss.admin.topics.create(connection, {
      body: duplicateBody,
    });
  });

  // 4) Attempt unauthenticated creation (create a fresh connection without headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthBody = {
    code: `unauth_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEconDiscussTopic.ICreate;
  await TestValidator.error(
    "unauthorized topic creation should fail",
    async () => {
      await api.functional.econDiscuss.admin.topics.create(unauthConn, {
        body: unauthBody,
      });
    },
  );
}
