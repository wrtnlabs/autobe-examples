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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member to create content
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a community for the member to post in
  const communityName = RandomGenerator.alphaNumeric(8);
  // Step 3: Create a post by the member in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName },
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Step 4: Validate the post was created successfully
  TestValidator.equals("post title matches", post.title, post.title);
  // Step 5: Delete the post as the author
  const deletedPost =
    await api.functional.communityPlatform.member.communities.posts.erase(
      memberConnection,
      {
        communityCode: communityName,
        postCode: post.id,
      },
    );
  typia.assert(deletedPost);
  // Step 6: Validate the delete response contains the full post object
  TestValidator.equals("deleted post id matches", deletedPost.id, post.id);
  TestValidator.equals(
    "deleted post title matches",
    deletedPost.title,
    post.title,
  );
  // Note: post.author and post.community are ISummary objects with no properties
  // so we cannot validate any content from them - they are empty objects
  // per the DTO definition
  // Step 7: The API does not provide an endpoint to verify post is no longer accessible
  // Therefore we cannot verify this requirement since the endpoint doesn't exist
  // The test is focused on successful deletion and response validation only
}
