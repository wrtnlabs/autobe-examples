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

/**
 * E2E test for deleting a community ban with an invalid/non-existent banId.
 */
export async function test_api_community_ban_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  // The ICommunityPlatformModerator.IJoin type is empty; send empty body
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Use authorized token for subsequent calls
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt deleting a ban with a random UUID that should not exist
  const fakeBanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect a 404 Not Found error from deletion attempt
  await TestValidator.httpError(
    "delete community ban with non-existent banId should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.community_bans.erase(
        moderatorConnection,
        { banId: fakeBanId },
      );
    },
  );
}
