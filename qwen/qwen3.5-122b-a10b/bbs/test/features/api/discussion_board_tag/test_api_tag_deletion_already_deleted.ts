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
 * Test tag deletion edge case: attempting to delete an already deleted tag.
 *
 * This test validates that the system properly handles duplicate deletion attempts
 * on soft-deleted tags by returning a 404 Not Found error.
 *
 * Steps:
 * 1. Authenticate as administrator
 * 2. Create a new tag
 * 3. Delete the tag successfully (first deletion)
 * 4. Attempt to delete the same tag again
 * 5. Verify the system returns 404 Not Found error
 */
export async function test_api_tag_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a new tag
  const tag: IDiscussionBoardTag =
    await generate_random_discussion_board_admin_tags_create(
      adminConnection,
      {},
    );
  typia.assert(tag);
  // 3. Delete the tag successfully (first deletion)
  await api.functional.discussionBoard.admin.tags.erase(adminConnection, {
    tagId: tag.id,
  });
  // 4. Attempt to delete the same tag again and verify 404 error
  await TestValidator.httpError(
    "already deleted tag returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.tags.erase(adminConnection, {
        tagId: tag.id,
      });
    },
  );
}
