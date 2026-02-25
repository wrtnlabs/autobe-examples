import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_creation_unsubscribed_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create a new community
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = memberConnection.headers;
  const community: IRedditCommunityCommunity =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // 3. Attempt to create a post in the community without subscription
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers; // Member is not subscribed to the community
  await TestValidator.httpError(
    "should return 403 Forbidden for post creation in unsubscribed community",
    403,
    async () => {
      await api.functional.redditCommunity.member.posts.create(postConnection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_id: community.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityPost.ICreate,
      });
    },
  );
}
