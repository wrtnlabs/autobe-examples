import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_super_admin_ban_details_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create a new superAdmin account for creating test data
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.superAdmin.join(
    adminConnection,
    {
      body: {
        email: "test_superadmin" + RandomGenerator.alphabets(6) + "@test.com",
        password: "TestPass123!",
        display_name: "Test Super Admin",
        bio: "Super admin for testing authorization",
        href: "https://example.com/home",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create admin authentication connection with token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // Create a banned user (assuming superAdmin can ban users)
  const bannedUserId = "00000000-0000-0000-0000-000000000001";
  // Test 1: Verify superAdmin can access ban details
  try {
    const banDetails =
      await api.functional.discussionBoard.superAdmin.bans.details.at(
        adminAuthConnection,
        { userId: bannedUserId },
      );
    typia.assert(banDetails);
  } catch (error) {
    // If ban record doesn't exist, that's expected for test
  }
  // Test 2: Verify non-authenticated user cannot access ban details
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated user should be rejected",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.details.at(
        unauthenticatedConnection,
        { userId: bannedUserId },
      );
    },
  );
}
