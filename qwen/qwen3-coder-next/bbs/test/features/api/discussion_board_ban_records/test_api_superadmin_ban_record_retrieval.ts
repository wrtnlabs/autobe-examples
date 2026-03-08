import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_ban_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as super admin user
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Test retrieving a non-existent ban record (should return 404)
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for non-existent ban",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.at(
        superAdminConnection,
        {
          banId: nonExistentBanId,
        },
      );
    },
  );
  // 3. Test with a valid banId (if we had a way to create one)
  // Since the ban creation endpoint is not available in the provided API functions,
  // we'll test the successful retrieval path with a hypothetical existing ban
  // For now, we can only test the error case and authentication flow
  // A complete test would require:
  // - Member creation endpoint
  // - Ban creation endpoint (POST /discussionBoard/superAdmin/bans)
  //
  // The following code shows what would be implemented if those endpoints existed:
  /*
    // Create a member user first
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);
  
    // Ban the member
    const banCreation = await api.functional.discussionBoard.superAdmin.bans.create(superAdminConnection, {
      body: {
        member_id: member.id,
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    });
    typia.assert(banCreation);
  
    // Retrieve the ban record
    const banRecord = await api.functional.discussionBoard.superAdmin.bans.at(superAdminConnection, {
      banId: banCreation.id,
    });
    typia.assert(banRecord);
  
    // Verify response contains complete information
    TestValidator.predicate("banId matches", banRecord.id === banCreation.id);
    TestValidator.predicate("user information exists", banRecord.user.id !== undefined);
    TestValidator.predicate("administrator information exists", banRecord.administrator.id !== undefined);
    TestValidator.predicate("ban reason exists", banRecord.ban_reason !== undefined && banRecord.ban_reason.length > 0);
    TestValidator.predicate("banned_at timestamp exists", banRecord.banned_at !== undefined);
    TestValidator.predicate("created_at timestamp exists", banRecord.created_at !== undefined);
    TestValidator.predicate("updated_at timestamp exists", banRecord.updated_at !== undefined);
    TestValidator.predicate("deleted_at timestamp exists", banRecord.deleted_at !== undefined);
    */
}
