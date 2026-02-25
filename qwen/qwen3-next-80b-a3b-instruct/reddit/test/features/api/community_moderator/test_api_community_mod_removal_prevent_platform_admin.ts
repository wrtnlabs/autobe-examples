import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_community_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_moderator_communities_moderators_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_mod_removal_prevent_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdminUser = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(platformAdminUser);
  // 2. Create a community
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(communityOwner);
  const community =
    await api.functional.redditCommunity.member.communities.create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Assign platform admin as moderator of the community
  const assignModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_login(assignModeratorConnection, {
    body: {
      email: platformAdminUser.email!,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const moderatorAssignment =
    await api.functional.redditCommunity.communityModerator.communities.moderators.create(
      assignModeratorConnection,
      {
        communityId: community.id,
        body: {
          userId: platformAdminUser.id,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Authenticate as community owner and attempt to remove platform admin moderator
  const communityOwnerAuthConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_community_owner_login(communityOwnerAuthConnection, {
    body: {
      email: communityOwner.email!,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Attempt to remove the platform admin as moderator - must return 403 Forbidden
  await TestValidator.httpError(
    "community owner cannot remove platform admin moderator",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.moderators.erase(
        communityOwnerAuthConnection,
        {
          communityId: community.id,
          userId: platformAdminUser.id,
        },
      );
    },
  );
  // 5. Confirm platform admin still has moderator status
  const verifyModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_login(verifyModeratorConnection, {
    body: {
      email: platformAdminUser.email!,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const verifyModeration =
    await api.functional.redditCommunity.communityModerator.communities.moderators.create(
      verifyModeratorConnection,
      {
        communityId: community.id,
        body: {
          userId: platformAdminUser.id,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(verifyModeration);
}
