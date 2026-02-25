import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_communities_moderators_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempting to update moderator roles with unauthorized access (non-moderator).
  // Verifies that users without moderator privileges cannot update the moderators list and receive an appropriate authorization error response.
  // 1. Create an ordinary user (not a moderator) and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {});
  // update userConnection with access token
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Create a moderator account and authenticate
  const modConnection: api.IConnection = { host: connection.host };
  const modAuthorized = await authorize_moderator_join(modConnection, { body: {} });
  modConnection.headers = { Authorization: modAuthorized.token.access };
  // 3. Using the moderator connection, create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      modConnection,
      {},
    );
  typia.assert(community);
  // 4. Normally, a moderator would assign moderators (including self) - simulate that
  // We skip actual assignment here as not needed for this test
  // 5. Now, attempt unauthorized update of moderators by the ordinary user
  const updateBody: ICommunityPlatformCommunityModerator.IUpdate = {
    role: "moderator",
  };
  await TestValidator.httpError(
    "unauthorized user cannot update moderators",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.updateModerators(
        userConnection,
        {
          communityId: community.id,
          body: updateBody,
        },
      );
    },
  );
}
