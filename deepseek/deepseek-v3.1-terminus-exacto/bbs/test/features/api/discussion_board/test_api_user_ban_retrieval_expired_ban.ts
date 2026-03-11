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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_retrieval_expired_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create an expired ban record with expiration date in the past
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
  const expiredBan =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          expires_at: pastDate.toISOString(),
        } satisfies DeepPartial<IDiscussionBoardUserBan.ICreate>,
      },
    );
  typia.assert(expiredBan);
  // Retrieve the expired ban record
  const retrievedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.at(
      superAdminConnection,
      {
        banId: expiredBan.id,
      },
    );
  typia.assert(retrievedBan);
  // Validate that the ban status is 'expired'
  TestValidator.equals(
    "ban status should be 'expired'",
    retrievedBan.status,
    "expired",
  );
  // Validate that timing information is preserved
  TestValidator.equals("ban ID should match", retrievedBan.id, expiredBan.id);
  TestValidator.equals(
    "ban reason should match",
    retrievedBan.reason,
    expiredBan.reason,
  );
  TestValidator.equals(
    "banned_at should be preserved",
    retrievedBan.banned_at,
    expiredBan.banned_at,
  );
  TestValidator.equals(
    "expires_at should be preserved",
    retrievedBan.expires_at,
    expiredBan.expires_at,
  );
  // Validate that the ban record maintains full integrity
  TestValidator.predicate(
    "ban should have valid created_at timestamp",
    retrievedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "ban should have valid updated_at timestamp",
    retrievedBan.updated_at !== undefined,
  );
  TestValidator.predicate(
    "ban should have member information",
    retrievedBan.member !== undefined,
  );
  TestValidator.predicate(
    "ban should have admin information",
    retrievedBan.admin !== undefined,
  );
}
