import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_moderator_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_moderator_communities_moderators_add";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_role } from "../../../prepare/prepare_random_reddit_platform_community_role";

export async function test_api_community_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a user and create a community (become owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinInput = {} satisfies IRedditPlatformUser.IJoin;
  const ownerResponse = await api.functional.redditPlatform.auth.user.join(
    ownerConnection,
    {
      body: ownerJoinInput,
    },
  );
  typia.assert(ownerResponse);
  ownerConnection.headers = { Authorization: ownerResponse.token.access };
  // Create community as owner
  const communityCreateInput = {} satisfies IRedditPlatformCommunity.ICreate;
  const createdCommunity =
    await api.functional.redditPlatform.user.communities.create(
      ownerConnection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(createdCommunity);
  // Get community ID (using type assertion as workaround for incomplete DTO)
  const communityId = (createdCommunity as any).id;
  // 2. Register a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {} satisfies IRedditPlatformModerator.IJoin;
  const moderatorResponse =
    await api.functional.redditPlatform.auth.moderator.join(
      moderatorConnection,
      {
        body: moderatorJoinInput,
      },
    );
  typia.assert(moderatorResponse);
  moderatorConnection.headers = {
    Authorization: moderatorResponse.token.access,
  };
  // 3. Add moderator to the community
  const moderatorAssignmentInput =
    {} satisfies IRedditPlatformCommunityRole.ICreate;
  const communityRole =
    await generate_random_reddit_platform_moderator_communities_moderators_add(
      ownerConnection,
      {
        body: moderatorAssignmentInput,
        params: {
          communityId: communityId,
        },
      },
    );
  typia.assert(communityRole);
  // 4. Login as moderator
  const moderatorLoginInput = {} satisfies IRedditPlatformModerator.ILogin;
  const moderatorLoginResponse =
    await api.functional.redditPlatform.auth.moderator.login(
      moderatorConnection,
      {
        body: moderatorLoginInput,
      },
    );
  typia.assert(moderatorLoginResponse);
  moderatorConnection.headers = {
    Authorization: moderatorLoginResponse.token.access,
  };
  // 5. Update community as moderator
  const updateInput = {} satisfies IRedditPlatformCommunity.IUpdate;
  const updatedCommunity =
    await api.functional.redditPlatform.communities.update(
      moderatorConnection,
      {
        communityId: communityId,
        body: updateInput,
      },
    );
  typia.assert(updatedCommunity);
  // 6. Validate update was successful
  TestValidator.equals(
    "community id unchanged",
    (updatedCommunity as any).id,
    communityId,
  );
}
