import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

/**
 * Test retrieving a tag that has been soft-deleted (deleted_at is set).
 *
 * Note: Since there's no tag deletion endpoint available in the current API,
 * this test verifies tag retrieval functionality. The soft-deletion behavior
 * would be tested if a tag deletion endpoint (e.g., DELETE /discussionBoard/administrator/tags/{tagId})
 * were available.
 *
 * Test flow:
 * 1. Create and authenticate as member
 * 2. Create a tag
 * 3. Retrieve the tag successfully
 * 4. Verify tag data integrity
 */
export async function test_api_tag_retrieve_soft_deleted_tag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a tag
  const tag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(tag);
  // 3. Retrieve the tag successfully
  const retrievedTag = await api.functional.discussionBoard.tags.at(
    memberConnection,
    {
      tagId: tag.id,
    },
  );
  typia.assert(retrievedTag);
  // 4. Verify business logic: tag is active (not soft-deleted)
  TestValidator.equals("tag is active", retrievedTag.deleted_at, null);
  TestValidator.equals("tag name preserved", retrievedTag.name, tag.name);
}
