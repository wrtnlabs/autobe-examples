import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_communities_posts_new_create } from "../../../generate/generate_random_community_platform_communities_posts_new_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_creation_by_subscribed_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // Step 2: Create a new community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_community_platform_member_communities_create(
      communityConnection,
      {
        body: {}, // ICommunityPlatformCommunity.ICreate is empty object
      },
    );
  // Step 3: Subscribe the member to the community
  const subscribeConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(subscribeConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  await api.functional.communityPlatform.member.communities.subscribers.create(
    subscribeConnection,
    {
      communityCode: community.community_code,
    },
  );
  // Step 4: Create a post in the subscribed community
  const postConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(postConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  const postTitle = RandomGenerator.name();
  const postContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const post =
    await api.functional.communityPlatform.communities.posts._new.create(
      postConnection,
      {
        communityCode: community.community_code,
        body: {
          title: postTitle,
          text: postContent,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  // Step 5: Validate post creation
  typia.assert(post);
  // Validate post properties
  TestValidator.equals("post has correct title", post.title, postTitle);
  TestValidator.equals(
    "post has correct content type",
    post.content_type,
    "text",
  );
  // The post.community is ICommunityPlatformCommunity.ISummary which has 'name'
  // The community object is ICommunityPlatformCommunity which has 'community_code'
  // According to DTO: community_code is the display name used in ISummary.name
  TestValidator.equals(
    "post has correct community name",
    post.community.name,
    community.community_code,
  );
  // The post.author is ICommunityPlatformMember.ISummary which is an empty object
  // We can only validate that the author property exists as an object, not any specific properties
  TestValidator.predicate("author is a non-null object", post.author !== null);
  TestValidator.equals("post has initial score of 0", post.score, 0);
  TestValidator.equals(
    "post has initial comment count of 0",
    post.comment_count,
    0,
  );
}
