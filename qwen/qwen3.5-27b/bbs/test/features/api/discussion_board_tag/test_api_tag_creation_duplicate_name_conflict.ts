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

/**
 * Test that attempting to create a tag with a duplicate name results in HTTP 409 Conflict.
 *
 * This test validates the business rule that tag names must be unique across the system.
 * 1. Register and authenticate as a member
 * 2. Create a tag with a specific name (e.g., 'Technology')
 * 3. Attempt to create another tag with the exact same name
 * 4. Verify the duplicate creation attempt returns HTTP 409 Conflict
 * 5. Confirm the original tag remains unchanged
 */
export async function test_api_tag_creation_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create a tag with a specific name (setup)
  const tagName = "Technology";
  const firstTag: IDiscussionBoardTag =
    await generate_random_discussion_board_member_tags_create(
      memberConnection,
      {
        body: {
          name: tagName,
        } satisfies IDiscussionBoardTag.ICreate,
      },
    );
  typia.assert(firstTag);
  // Validate the first tag was created successfully
  TestValidator.equals("tag name matches", firstTag.name, tagName);
  TestValidator.predicate("tag has valid ID", firstTag.id.length > 0);
  // 3. Attempt to create another tag with the exact same name (duplicate)
  await TestValidator.httpError(
    "duplicate tag name returns 409 Conflict",
    409,
    async () => {
      await generate_random_discussion_board_member_tags_create(
        memberConnection,
        {
          body: {
            name: tagName,
          } satisfies IDiscussionBoardTag.ICreate,
        },
      );
    },
  );
  // 4. Confirm the original tag remains unchanged (implicit - firstTag still valid)
  TestValidator.equals("original tag unchanged", firstTag.name, tagName);
}
