import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_tags_create } from "../../../generate/generate_random_discussion_board_admin_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test successful tag update operation with name and description changes.
 * 1. Authenticate as admin
 * 2. Create an initial tag with a name and description
 * 3. Update the tag with a new name and description
 * 4. Verify the response contains the updated tag with correct values
 * 5. Verify the updated_at timestamp is different from created_at
 */
export async function test_api_tag_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create an initial tag
  const initialTag = await generate_random_discussion_board_admin_tags_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(initialTag);
  // Store original timestamp for comparison
  const originalCreatedAt = initialTag.created_at;
  // 3. Update the tag with new name and description
  const newName = RandomGenerator.name(2);
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTag = await api.functional.discussionBoard.admin.tags.update(
    adminConnection,
    {
      tagId: initialTag.id,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IDiscussionBoardTag.IUpdate,
    },
  );
  typia.assert(updatedTag);
  // 4. Verify the response contains the updated tag with correct values
  TestValidator.equals("tag ID remains same", updatedTag.id, initialTag.id);
  TestValidator.equals("name is updated", updatedTag.name, newName);
  TestValidator.equals(
    "description is updated",
    updatedTag.description,
    newDescription,
  );
  // 5. Verify the updated_at timestamp is different from created_at
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedTag.updated_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedTag.updated_at > originalCreatedAt,
  );
}
