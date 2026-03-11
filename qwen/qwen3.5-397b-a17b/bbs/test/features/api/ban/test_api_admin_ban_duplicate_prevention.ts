import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test duplicate ban prevention business logic.
 *
 * This test validates that the system prevents banning an already-banned user.
 * The test flow:
 * 1. Create and authenticate as administrator to gain ban authority
 * 2. Create a member account that will be banned
 * 3. Successfully ban the member with a valid reason
 * 4. Attempt to ban the same member again with a different reason
 * 5. Verify the second ban request is rejected (business error: duplicate ban)
 *
 * This ensures the unique constraint on member_id is enforced and ban state
 * integrity is maintained.
 */
export async function test_api_admin_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account to be banned
  const memberJoin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  // 3. First ban - should succeed
  const firstBan = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        member_id: memberJoin.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(firstBan);
  // 4. Second ban attempt - should fail (duplicate ban prevention)
  await TestValidator.error("duplicate ban prevention", async () => {
    await api.functional.discussionBoard.admin.bans.create(adminConnection, {
      body: {
        member_id: memberJoin.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    });
  });
}
