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

export async function test_api_community_moderator_list_denied_for_non_member(
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
  // 4. Create member account (non-privileged user)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 5. Owner creates a community
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(communityConnection, {
    body: {
      email: (owner.email ?? "") satisfies string & tags.Format<"email">,
      password: owner.token.access,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  const community =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 6. Owner appoints first moderator
  const appoint1Connection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(appoint1Connection, {
    body: {
      email: (owner.email ?? "") satisfies string & tags.Format<"email">,
      password: owner.token.access,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    appoint1Connection,
    {
      body: {
        userId: moderator1.id,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
      params: { communityId: community.id },
    },
  );
  // 7. Owner appoints second moderator
  const appoint2Connection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(appoint2Connection, {
    body: {
      email: (owner.email ?? "") satisfies string & tags.Format<"email">,
      password: owner.token.access,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  await generate_random_reddit_community_community_owner_communities_moderators_create(
    appoint2Connection,
    {
      body: {
        userId: moderator2.id,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
      params: { communityId: community.id },
    },
  );
  // 8. Member attempts to list moderators (should be denied with 403 Forbidden)
  const listConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(listConnection, {
    body: {
      email: (member.email ?? "") satisfies string & tags.Format<"email">,
      password: member.token.access,
    } satisfies IRedditCommunityMember.ILogin,
  });
  await TestValidator.httpError(
    "member should not list moderators (403 Forbidden)",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.moderators.index(
        listConnection,
        {
          communityId: community.id,
        },
      );
    },
  );
}