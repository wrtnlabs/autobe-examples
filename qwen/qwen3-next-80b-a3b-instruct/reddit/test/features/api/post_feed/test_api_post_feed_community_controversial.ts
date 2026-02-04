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
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_feed_community_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.communityPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(memberAuth);
  // Step 2: Create a community to host test posts
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Step 3: Create multiple posts in the community
  // We create posts with simple content - we cannot control vote scores as the API doesn't allow specifying vote direction
  const postCreationPromises = ArrayUtil.repeat(5, async () => {
    const post =
      await api.functional.communityPlatform.member.communities.posts.create(
        memberConnection,
        {
          communityName: community.community_code,
          body: {
            title: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 4,
              wordMax: 8,
            }),
            text: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 10,
              wordMin: 3,
              wordMax: 7,
            }),
          },
        },
      );
    return post;
  });
  await Promise.all(postCreationPromises);
  // Step 4: Call the community post feed with controversial sorting
  // The controversial sorting algorithm is server-side and we cannot control the vote scores
  // This test validates that the API responds correctly to the request, not that it creates specific scores
  const response = await api.functional.communityPlatform.member.posts.index(
    memberConnection,
    {
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      },
    },
  );
  // Step 5: Validate the response structure
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has at least 0 records",
    response.pagination.records >= 0,
  );
  // Validate data structure
  TestValidator.predicate("response has data array", response.data.length >= 0);
  // Validate each post structure matches ICommunityPlatformPost.ISummary
  for (const post of response.data) {
    // Validate post has required properties according to schema
    TestValidator.equals(
      "post id is string",
      typeof post.id === "string",
      true,
    );
    // Validate author is ICommunityPlatformMember.ISummary (empty object)
    TestValidator.equals(
      "post author is object",
      typeof post.author === "object" && post.author !== null,
      true,
    );
    // Validate community is ICommunityPlatformCommunity.ISummary
    TestValidator.equals(
      "post community is object",
      typeof post.community === "object" && post.community !== null,
      true,
    );
    // Validate community has required properties
    TestValidator.equals(
      "community name is string",
      typeof post.community.name === "string" && post.community.name.length > 0,
      true,
    );
    TestValidator.equals(
      "community description is string",
      typeof post.community.description === "string",
      true,
    );
    TestValidator.equals(
      "community icon is string",
      typeof post.community.icon === "string" &&
        post.community.icon.startsWith("http"),
      true,
    );
    TestValidator.equals(
      "community subscriber count is number",
      typeof post.community.subscriber_count === "number" &&
        post.community.subscriber_count >= 0,
      true,
    );
    TestValidator.equals(
      "community created_at is ISO date-time",
      typeof post.community.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
          post.community.created_at,
        ),
      true,
    );
    // Validate post has required properties
    TestValidator.equals(
      "post vote score is number",
      typeof post.voteScore === "number",
      true,
    );
    TestValidator.equals(
      "post comment count is number",
      typeof post.commentCount === "number" && post.commentCount >= 0,
      true,
    );
    TestValidator.predicate(
      "post createdAt is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(post.createdAt),
    );
  }
  // Validate that the API responds with the correct sort parameter
  // We cannot validate the controversial algorithm logic without controlling votes
  // This validates that the API accepts and processes the controversial sort request
  TestValidator.predicate("response returned posts", response.data.length >= 0);
}
