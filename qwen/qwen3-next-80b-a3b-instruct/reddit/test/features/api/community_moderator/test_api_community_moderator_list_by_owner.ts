import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
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
import { generate_random_reddit_community_community_owner_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_moderators_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_moderator_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(owner);
  // 2. Create first moderator account
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_community_moderator_join(
    moderator1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator1);
  // 3. Create second moderator account
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_community_moderator_join(
    moderator2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator2);
  // 4. Create community with owner
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50> & tags.Pattern<"^[a-zA-Z0-9_-]+$">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Owner appoints first moderator
  const appoint1Connection: api.IConnection = { host: ownerConnection.host };
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    appoint1Connection,
    {
      body: {
        userId: moderator1.id,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  // 6. Owner appoints second moderator
  const appoint2Connection: api.IConnection = { host: ownerConnection.host };
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    appoint2Connection,
    {
      body: {
        userId: moderator2.id,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  // 7. Moderator requests list of moderators for the community
  const moderatorConnection: api.IConnection = {
    host: moderator1Connection.host,
  };
  const moderatorsResponse =
    await api.functional.redditCommunity.communityModerator.communities.moderators.index(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(moderatorsResponse);
  // 8. Validate response structure
  TestValidator.equals("pagination structure", moderatorsResponse.pagination, {
    current: 1,
    limit: 20,
    records: 2,
    pages: 1,
  });
  // 9. Verify both moderators are in the list with correct data
  const moderators = moderatorsResponse.data;
  TestValidator.equals("number of moderators", moderators.length, 2);
  // Verify first moderator
  const moderator1InList = moderators.find((m) => m.user.id === moderator1.id);
  TestValidator.notEquals("first moderator found", moderator1InList, undefined);
  TestValidator.equals(
    "first moderator username",
    moderator1InList?.user.username,
    moderator1.username,
  );
  TestValidator.equals(
    "first moderator display name",
    moderator1InList?.user.display_name,
    moderator1.display_name,
  );
  TestValidator.equals(
    "first moderator karma score",
    moderator1InList?.user.karma_score,
    moderator1.karma_score,
  );
  TestValidator.equals(
    "first moderator community id",
    moderator1InList?.community.id,
    community.id,
  );
  TestValidator.equals(
    "first moderator community name",
    moderator1InList?.community.name,
    community.name,
  );
  TestValidator.predicate(
    "first moderator createdAt is valid",
    () => {
      const m = moderator1InList;
      if (m === undefined || m === null) return false;
      const d = new Date(m.createdAt);
      return !isNaN(d.getTime()) && d.toISOString() === m.createdAt;
    },
  );
  // Verify second moderator
  const moderator2InList = moderators.find((m) => m.user.id === moderator2.id);
  TestValidator.notEquals(
    "second moderator found",
    moderator2InList,
    undefined,
  );
  TestValidator.equals(
    "second moderator username",
    moderator2InList?.user.username,
    moderator2.username,
  );
  TestValidator.equals(
    "second moderator display name",
    moderator2InList?.user.display_name,
    moderator2.display_name,
  );
  TestValidator.equals(
    "second moderator karma score",
    moderator2InList?.user.karma_score,
    moderator2.karma_score,
  );
  TestValidator.equals(
    "second moderator community id",
    moderator2InList?.community.id,
    community.id,
  );
  TestValidator.equals(
    "second moderator community name",
    moderator2InList?.community.name,
    community.name,
  );
  TestValidator.predicate(
    "second moderator createdAt is valid",
    () => {
      const m = moderator2InList;
      if (m === undefined || m === null) return false;
      const d = new Date(m.createdAt);
      return !isNaN(d.getTime()) && d.toISOString() === m.createdAt;
    },
  );
}