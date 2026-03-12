import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_retrieve_active_tag(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving an existing active tag by its UUID.
   * 1. Register a new member account
   * 2. Create an active tag with the member
   * 3. Retrieve the tag by its UUID
   * 4. Validate the response contains correct data
   */
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  // 2. Create an active tag using the member connection
  const createdTag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(createdTag);
  // 3. Retrieve the tag by its UUID (public endpoint)
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrievedTag = await api.functional.discussionBoard.tags.at(
    retrieveConnection,
    {
      tagId: createdTag.id,
    },
  );
  typia.assert(retrievedTag);
  // 4. Validate business logic
  TestValidator.equals("tag name matches", retrievedTag.name, createdTag.name);
  TestValidator.equals("tag ID matches", retrievedTag.id, createdTag.id);
  TestValidator.equals(
    "deleted_at is null for active tag",
    retrievedTag.deleted_at,
    null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedTag.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedTag.updated_at.length > 0,
  );
}
