import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_user_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized (non-admin) users cannot delete banned user records.
  // We do not perform admin authorization here on purpose to simulate unauthorized user
  // Generate a random bannedUserId for test - this should represent an existing ban theoretically but as we have no create ban API access, random UUID is used
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete banned user without admin authorization
  // Expect an HttpError with status 403 (Forbidden)
  await TestValidator.httpError(
    "unauthorized deletion of banned user should be forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.admin.bannedUsers.eraseBannedUser(
        connection,
        { bannedUserId },
      );
    },
  );
  // Since no admin rights, banned user record should remain unchanged
  // But as we use random bannedUserId, actual record check is not possible here.
  // The main assertion is the 403 forbidden error preventing deletion.
}
