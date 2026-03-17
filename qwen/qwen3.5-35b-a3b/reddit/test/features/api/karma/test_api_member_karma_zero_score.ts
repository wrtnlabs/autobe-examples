import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_karma_zero_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Update memberConnection with token
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Get communities
  const communitiesResponse =
    await api.functional.redditCommunity.communities.index(memberConnection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(communitiesResponse);
  TestValidator.equals(
    "communities list not empty",
    communitiesResponse.data.length > 0,
    true,
  );
  // 3. Create post in community
  const communityId = communitiesResponse.data[0].id;
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(4),
        community_id: communityId,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Get author UUID from post
  const memberId = post.author.id;
  typia.assert(memberId);
  // 5. Query karma
  const karma = await api.functional.redditCommunity.members.karma.at(
    memberConnection,
    {
      memberId,
    },
  );
  typia.assert(karma);
  // 6. Validate karma is 0
  TestValidator.equals(
    "karma score is zero for new member",
    karma.current_score,
    0,
  );
  TestValidator.equals(
    "reddit_member_id matches",
    karma.reddit_member_id,
    memberId,
  );
  TestValidator.notEquals("karma record id exists", karma.id, undefined);
  TestValidator.notEquals("created_at exists", karma.created_at, undefined);
  TestValidator.notEquals("updated_at exists", karma.updated_at, undefined);
}
