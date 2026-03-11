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

/**
 * Test that a super administrator can successfully retrieve detailed ban record information
 * including banned member identity, banning administrator details, ban reason, status,
 * and comprehensive timing information.
 */
export async function test_api_user_ban_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a ban record
  const banRecord =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: null,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Retrieve the ban record
  const retrievedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.at(
      superAdminConnection,
      {
        banId: banRecord.id,
      },
    );
  typia.assert(retrievedBan);
  // 4. Validate the retrieved ban record matches the created ban record
  TestValidator.equals("ban record id", retrievedBan.id, banRecord.id);
  TestValidator.equals("ban reason", retrievedBan.reason, banRecord.reason);
  TestValidator.equals("ban status", retrievedBan.status, banRecord.status);
  TestValidator.equals(
    "banned at",
    retrievedBan.banned_at,
    banRecord.banned_at,
  );
  TestValidator.equals(
    "expires at",
    retrievedBan.expires_at,
    banRecord.expires_at,
  );
  TestValidator.equals(
    "created at",
    retrievedBan.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "updated at",
    retrievedBan.updated_at,
    banRecord.updated_at,
  );
  // 5. Verify all required fields are present
  TestValidator.predicate(
    "has member information",
    retrievedBan.member !== undefined,
  );
  TestValidator.predicate(
    "has admin information",
    retrievedBan.admin !== undefined,
  );
  // 6. Test business logic
  TestValidator.predicate(
    "ban status is active",
    retrievedBan.status === "active",
  );
}
