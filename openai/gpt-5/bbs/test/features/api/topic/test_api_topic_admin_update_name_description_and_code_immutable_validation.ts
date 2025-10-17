import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

export async function test_api_topic_admin_update_name_description_and_code_immutable_validation(
  connection: api.IConnection,
) {
  /**
   * Validate admin can update a topic's name/description while `code` remains
   * immutable. Also verify unauthenticated update is rejected and updating
   * unknown topicId fails.
   *
   * Steps:
   *
   * 1. Admin join to acquire Authorization (SDK injects token to connection)
   * 2. Create a topic to be updated
   * 3. Update name/description and verify business rules and timestamps
   * 4. Unauthenticated boundary: update without Authorization should fail
   * 5. Not found: update with random UUID should fail
   */

  // 1) Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2) Create a topic to update
  const createTopicBody = {
    code: `eco-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IEconDiscussTopic.ICreate;
  const created = await api.functional.econDiscuss.admin.topics.create(
    connection,
    { body: createTopicBody },
  );
  typia.assert(created);

  // 3) Update the topic's name and description
  const newName: string = RandomGenerator.name(3);
  const newDesc: string = RandomGenerator.paragraph({ sentences: 10 });
  const updateBody = {
    name: newName,
    description: newDesc,
  } satisfies IEconDiscussTopic.IUpdate;
  const updated = await api.functional.econDiscuss.admin.topics.update(
    connection,
    { topicId: created.id, body: updateBody },
  );
  typia.assert(updated);

  // Business validations
  TestValidator.equals(
    "code remains unchanged after update",
    updated.code,
    created.code,
  );
  TestValidator.equals("name updated as requested", updated.name, newName);
  TestValidator.equals(
    "description updated as requested",
    updated.description,
    newDesc,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    created.updated_at,
  );

  // 4) Authorization boundary: try PUT without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated update should be rejected",
    async () => {
      const unauthorizedUpdateBody = {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEconDiscussTopic.IUpdate;
      await api.functional.econDiscuss.admin.topics.update(unauthConn, {
        topicId: created.id,
        body: unauthorizedUpdateBody,
      });
    },
  );

  // 5) Not found: update with a random well-formed UUID
  const missingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent topic should fail",
    async () => {
      const notFoundUpdateBody = {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IEconDiscussTopic.IUpdate;
      await api.functional.econDiscuss.admin.topics.update(connection, {
        topicId: missingId,
        body: notFoundUpdateBody,
      });
    },
  );
}
