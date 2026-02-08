import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_ban_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Authorization failure scenario: Attempt to delete a community ban without moderator authentication. Ensure the API returns an authorization error (401 Unauthorized or 403 Forbidden) indicating insufficient permissions to delete the ban record.
  // 1. Perform moderator join to establish moderator context
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorJoinConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin is empty object per definition
  });
  typia.assert(authorized);
  // 2. Generate random banId
  const banId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the ban using base connection (unauthenticated - no Authorization header)
  // This should fail with 401 or 403
  await TestValidator.httpError(
    "should reject ban deletion without authorization",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.community_bans.erase(
        connection, // base connection used here intentionally
        { banId },
      );
    },
  );
}
