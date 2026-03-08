import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_assignment_unauthorized_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins (will become owner)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Second member joins (will become moderator)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(secondMember);
  // 3. Create community with first member
  const communityName = RandomGenerator.alphaNumeric(6);
  await api.functional.redditLike.communities.index(firstMemberConnection, {
    body: {
      search: communityName,
      sort: "alpha",
      subscriptionStatus: "all",
      page: 1,
      limit: 10,
    } satisfies IRedditLikeCommunity.IRequest,
  });
  // 4. Assign second member as moderator using first member (owner) credentials
  const communityList = await api.functional.redditLike.communities.index(
    firstMemberConnection,
    {
      body: {
        search: communityName,
        sort: "alpha",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(communityList);
  // Find the community or use existing
  const createdCommunity = communityList.data.find(
    (c) => c.name === communityName,
  );
  if (!createdCommunity) {
    throw new Error("Community not found");
  }
  // Assign second member as moderator
  const moderatorAssignment =
    await api.functional.redditLike.member.communities.moderators.create(
      firstMemberConnection,
      {
        communityName: communityName,
        body: {
          user_id: secondMember.id,
          community_id: createdCommunity.id,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Join third member (attempted new moderator)
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(thirdMember);
  // 6. Try to assign third member as moderator using second member (moderator) credentials - should fail
  await TestValidator.error(
    "moderator cannot assign other moderators",
    async () => {
      await api.functional.redditLike.member.communities.moderators.create(
        secondMemberConnection,
        {
          communityName: communityName,
          body: {
            user_id: thirdMember.id,
            community_id: createdCommunity.id,
            role: "moderator",
          } satisfies IRedditLikeModeratorRole.ICreate,
        },
      );
    },
  );
  // 7. Verify owner can still assign moderators after moderator assignment
  const anotherModeratorAssignment =
    await api.functional.redditLike.member.communities.moderators.create(
      firstMemberConnection,
      {
        communityName: communityName,
        body: {
          user_id: thirdMember.id,
          community_id: createdCommunity.id,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(anotherModeratorAssignment);
}