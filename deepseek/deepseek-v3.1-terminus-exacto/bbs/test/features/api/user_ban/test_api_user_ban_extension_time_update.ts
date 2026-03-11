import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_extension_time_update(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create member account that will be banned
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
  typia.assert(member);
  // Create initial temporary ban with expiration date
  const initialExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const initialBan =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          member_id: member.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: initialExpiresAt,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // Test 1: Extend ban duration by moving expiration date forward
  const extendedExpiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days from now
  const extendedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: initialBan.id,
        body: {
          expires_at: extendedExpiresAt,
        } satisfies IDiscussionBoardUserBan.IUpdate,
      },
    );
  typia.assert(extendedBan);
  // Validate extended ban properties
  TestValidator.equals(
    "expiration date should be extended",
    extendedBan.expires_at,
    extendedExpiresAt,
  );
  TestValidator.notEquals(
    "updated_at should change",
    extendedBan.updated_at,
    initialBan.updated_at,
  );
  // Test 2: Shorten ban duration by moving expiration date backward
  const shortenedExpiresAt = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 3 days from now
  const shortenedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: initialBan.id,
        body: {
          expires_at: shortenedExpiresAt,
        } satisfies IDiscussionBoardUserBan.IUpdate,
      },
    );
  typia.assert(shortenedBan);
  // Validate shortened ban properties
  TestValidator.equals(
    "expiration date should be shortened",
    shortenedBan.expires_at,
    shortenedExpiresAt,
  );
  // Test 3: Convert temporary ban to permanent ban by setting null expiration
  const permanentBan =
    await api.functional.discussionBoard.superAdmin.user_bans.update(
      superAdminConnection,
      {
        banId: initialBan.id,
        body: {
          expires_at: null,
        } satisfies IDiscussionBoardUserBan.IUpdate,
      },
    );
  typia.assert(permanentBan);
  // Validate permanent ban properties
  TestValidator.equals(
    "expiration date should be null for permanent ban",
    permanentBan.expires_at,
    null,
  );
  // Final validation: Ensure all ban updates maintained core metadata
  TestValidator.equals(
    "ban ID should remain constant",
    permanentBan.id,
    initialBan.id,
  );
  TestValidator.equals(
    "ban reason should remain unchanged",
    permanentBan.reason,
    initialBan.reason,
  );
  TestValidator.equals(
    "member ID should remain unchanged",
    permanentBan.member?.id,
    member.id,
  );
  TestValidator.equals(
    "banned_at timestamp should remain unchanged",
    permanentBan.banned_at,
    initialBan.banned_at,
  );
}
