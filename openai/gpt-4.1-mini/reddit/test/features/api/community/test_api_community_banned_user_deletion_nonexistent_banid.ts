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

export async function test_api_community_banned_user_deletion_nonexistent_banid(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to delete a banned user entry that does not exist.
  // 1. Authenticate as a moderator and join.
  // 2. Use a non-existent banId with the DELETE operation.
  // 3. Verify the response is an error indicating the ban entry is not found (e.g., HTTP 404 Not Found).
  // 4. Confirm no changes to existing banned user entries in the community.
  // 1. Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // Use random UUID for communityId and banId that won't exist
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 2. Try deleting non-existent banned user entry
  // Expect HttpError with status 404
  await TestValidator.httpError(
    "delete non-existent banned user should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.erase(
        moderatorConnection,
        {
          communityId,
          banId: nonExistentBanId,
        },
      );
    },
  );
  // 4. No direct way to confirm no changes, but at least the non-existent ban deletion triggers 404
}
