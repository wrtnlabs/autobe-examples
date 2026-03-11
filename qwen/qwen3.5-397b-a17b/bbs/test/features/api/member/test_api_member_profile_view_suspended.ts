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

export async function test_api_member_profile_view_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account that will be suspended
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Create and authenticate administrator
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
    },
  });
  typia.assert(adminAuth);
  // 3. Administrator bans the member
  const ban = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        member_id: memberId,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. View the suspended member's public profile (no authentication required)
  const guestConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.discussionBoard.members.at(
    guestConnection,
    {
      memberId: memberId,
    },
  );
  typia.assert(profile);
  // 5. Validate profile shows suspended status
  TestValidator.equals(
    "member status is suspended",
    profile.status,
    "suspended",
  );
  // 6. Verify all public profile fields are present
  TestValidator.equals("member ID matches", profile.id, memberId);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, memberAuth.bio);
  TestValidator.predicate(
    "articles count is non-negative",
    profile.articles_count >= 0,
  );
  TestValidator.predicate(
    "comments count is non-negative",
    profile.comments_count >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date",
    new Date(profile.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(profile.updated_at).getTime() > 0,
  );
}
