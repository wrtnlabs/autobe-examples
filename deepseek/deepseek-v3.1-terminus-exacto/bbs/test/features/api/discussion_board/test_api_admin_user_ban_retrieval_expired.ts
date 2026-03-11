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

export async function test_api_admin_user_ban_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  // 3. Create ban with immediate expiration (past timestamp)
  const ban = await generate_random_discussion_board_admin_user_bans_create(
    adminConnection,
    {
      body: {
        member_id: member.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expires_at: new Date(Date.now() - 1000).toISOString(), // Set expiration in the past
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Retrieve the expired ban record
  const retrievedBan = await api.functional.discussionBoard.admin.user_bans.at(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 5. Validate ban record details
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals("member ID matches", retrievedBan.member?.id, member.id);
  TestValidator.equals("ban reason matches", retrievedBan.reason, ban.reason);
  TestValidator.predicate(
    "status field exists",
    typeof retrievedBan.status === "string",
  );
  TestValidator.predicate(
    "banned_at timestamp exists",
    retrievedBan.banned_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedBan.updated_at !== undefined,
  );
  // 6. Validate timing information
  const bannedAt = new Date(retrievedBan.banned_at);
  const currentTime = new Date();
  TestValidator.predicate(
    "ban was created in the past",
    bannedAt < currentTime,
  );
  // Handle expires_at which can be null
  if (
    retrievedBan.expires_at !== null &&
    retrievedBan.expires_at !== undefined
  ) {
    const expiresAt = new Date(retrievedBan.expires_at);
    TestValidator.predicate("ban has expired", expiresAt < currentTime);
    TestValidator.predicate(
      "expiration is after ban creation",
      bannedAt < expiresAt,
    );
  }
  // 7. Validate audit trail integrity
  TestValidator.predicate(
    "member summary exists",
    retrievedBan.member !== undefined,
  );
  TestValidator.equals(
    "member display name",
    retrievedBan.member?.display_name,
    member.display_name,
  );
  TestValidator.equals("member bio", retrievedBan.member?.bio, member.bio);
  TestValidator.predicate(
    "admin summary exists",
    retrievedBan.admin !== undefined,
  );
}
