import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a regular member user cannot delete a discussion board section.
 * This validates authorization enforcement for admin-only operations.
 *
 * Test Steps:
 * 1. Register and authenticate a regular member user (MEMBER permission level)
 * 2. Attempt to delete a section by calling DELETE endpoint
 * 3. Verify the response returns 403 Forbidden (authorization denied)
 *
 * Authorization Check:
 * - Section deletion requires ADMINISTRATOR or SUPER_ADMINISTRATOR level
 * - MEMBER level users must be rejected with 403 Forbidden
 * - Authorization should be checked before resource existence
 */
export async function test_api_section_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member user connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_user_join(memberConnection, {});
  typia.assert(memberAuth);
  // Verify the user has MEMBER permission level
  TestValidator.equals(
    "permission level is MEMBER",
    memberAuth.permission_level,
    "MEMBER",
  );
  // Step 2: Attempt to delete a section (should fail with 403)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify 403 Forbidden response
  await TestValidator.httpError(
    "member cannot delete section",
    403,
    async () => {
      await api.functional.discussionBoard.user.sections.erase(
        memberConnection,
        {
          sectionId,
        },
      );
    },
  );
}
