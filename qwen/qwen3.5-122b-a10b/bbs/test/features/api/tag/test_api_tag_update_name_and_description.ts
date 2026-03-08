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

export async function test_api_tag_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create first tag
  const tag1 = await generate_random_discussion_board_admin_tags_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag1);
  // 3. Create second tag (for uniqueness test)
  const tag2 = await generate_random_discussion_board_admin_tags_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tag2);
  // 4. Update tag1 with new name and description
  const newName = RandomGenerator.name(2);
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTag = await api.functional.discussionBoard.admin.tags.update(
    adminConnection,
    {
      tagId: tag1.id,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IDiscussionBoardTag.IUpdate,
    },
  );
  typia.assert(updatedTag);
  // 5. Verify the update was successful
  TestValidator.equals("tag name updated", updatedTag.name, newName);
  TestValidator.equals(
    "tag description updated",
    updatedTag.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    tag1.updated_at,
    updatedTag.updated_at,
  );
  TestValidator.equals("tag id unchanged", updatedTag.id, tag1.id);
  TestValidator.equals(
    "article count preserved",
    updatedTag.article_count,
    tag1.article_count,
  );
  // 6. Test tag name uniqueness - attempting to update tag2 to tag1's new name should fail
  await TestValidator.error("cannot update tag to existing name", async () => {
    await api.functional.discussionBoard.admin.tags.update(adminConnection, {
      tagId: tag2.id,
      body: {
        name: newName, // This name already exists from tag1
      } satisfies IDiscussionBoardTag.IUpdate,
    });
  });
}
