import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_admin_user_ban_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuthorized);
  // 2. Create member account to be banned using member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuthorized);
  // 3. Create ban record using admin connection
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          member_id: memberAuthorized.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: null,
        },
      },
    );
  typia.assert(banRecord);
  // 4. Retrieve the ban record using the ban ID
  const retrievedBan = await api.functional.discussionBoard.admin.user_bans.at(
    adminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedBan);
  // 5. Validate ban record fields
  TestValidator.equals("ban ID matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "ban status matches",
    retrievedBan.status,
    banRecord.status,
  );
  TestValidator.equals("expires_at is null", retrievedBan.expires_at, null);
  TestValidator.predicate(
    "has banned_at timestamp",
    retrievedBan.banned_at !== undefined,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedBan.updated_at !== undefined,
  );
  // Validate timestamp is recent (within last hour)
  const banTime = new Date(retrievedBan.banned_at);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  TestValidator.predicate(
    "ban timestamp is recent",
    banTime >= hourAgo && banTime <= now,
  );
  // 6. Validate member reference
  TestValidator.predicate(
    "has member reference",
    retrievedBan.member !== undefined,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedBan.member!.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedBan.member!.display_name,
    memberAuthorized.display_name,
  );
  TestValidator.predicate(
    "member bio exists",
    retrievedBan.member!.bio !== undefined,
  );
  // 7. Validate admin reference
  TestValidator.predicate(
    "has admin reference",
    retrievedBan.admin !== undefined,
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedBan.admin!.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedBan.admin!.email,
    adminAuthorized.email,
  );
  TestValidator.equals(
    "admin grade matches",
    retrievedBan.admin!.admin_grade,
    adminAuthorized.admin_grade,
  );
}
