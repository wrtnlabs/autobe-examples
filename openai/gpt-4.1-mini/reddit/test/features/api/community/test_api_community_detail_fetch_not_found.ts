import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_detail_fetch_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test fetching community details for a non-existing communityId by an authenticated moderator.
  // - Authenticate as moderator using /auth/moderator/join.
  // - Attempt GET request with a random UUID communityId that does not exist.
  // - Validate HTTP 404 response with appropriate error message.
  // - Ensure no data leakage or unexpected responses.
  // - Check correct error handling without authorization failures.
  // 1. Moderator joins to get authenticated connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = {
    ...(moderatorConnection.headers ?? {}),
    Authorization: moderatorAuth.token.access,
  };
  // 2. Use a random UUID which does not exist
  const nonExistingCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch community details with non-existing community ID
  //    Expect HttpError with status 404
  await TestValidator.httpError(
    "fetch non-existing community detail returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.communities.at(
        moderatorConnection,
        { communityId: nonExistingCommunityId },
      );
    },
  );
}
