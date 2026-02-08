import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_community_bans_create } from "../../../generate/generate_random_community_platform_moderator_community_bans_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { generate_random_community_platform_user_community_subscriptions_create } from "../../../generate/generate_random_community_platform_user_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_ban_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a community ban record with a non-existent banId as an authorized moderator.
  // Validate 404 Not Found error response with appropriate message indicating ban record does not exist.
  // Confirm authorization is enforced and resource existence is correctly checked.
  // 1. Create a moderator connection and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_login(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.ILogin>(),
  });
  typia.assert(moderatorAuth);
  // 2. Use the updated header for subsequent moderator requests
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 3. Generate a random UUID that is highly unlikely to exist
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the non-existent community ban and expect 404 error
  await TestValidator.httpError(
    "retrieving non-existent community ban returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.community_bans.at(
        moderatorConnection,
        { banId: nonExistentBanId },
      );
    },
  );
}
