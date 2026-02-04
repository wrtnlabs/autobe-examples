import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { generate_random_community_platform_communities_posts_new_create } from "../../../generate/generate_random_community_platform_communities_posts_new_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_sorting_best(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member using the provided utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // memberConnection.headers is now updated internally by authorize function
  // Step 2: Create a post for which we will sort comments (via provided utility function)
  const communityCode: string = RandomGenerator.alphaNumeric(8);
  const post =
    await generate_random_community_platform_communities_posts_new_create(
      memberConnection,
      {
        params: {
          communityCode,
        },
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Step 3: Sort comments using the only available API endpoint
  // SDK provides: api.functional.communityPlatform.posts.comments.sort.index
  const bestSortResult: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.sort.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          limit: 20,
          offset: 0,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestSortResult);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination current page should be 1",
    bestSortResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    bestSortResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    bestSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    bestSortResult.pagination.pages >= 0,
  );
  // Step 5: Validate data array exists and is array of ICommunityPlatformComment.ISummary
  TestValidator.predicate(
    "data must be an array",
    Array.isArray(bestSortResult.data),
  );
  // Step 6: Validate each comment in data array has correct structure
  for (const comment of bestSortResult.data) {
    typia.assert(comment);
    // Validate required properties from ICommunityPlatformComment.ISummary
    TestValidator.equals(
      "comment id must be a uuid",
      typeof comment.id === "string" && comment.id.length > 0,
      true,
    );
    TestValidator.equals(
      "comment content length <= 300",
      comment.content.length <= 300,
      true,
    );
    TestValidator.predicate(
      "comment voteScore must be a number",
      typeof comment.voteScore === "number",
    );
    TestValidator.predicate(
      "comment createdAt must be ISO 8601",
      new Date(comment.createdAt).toISOString() === comment.createdAt,
    );
    TestValidator.predicate(
      "comment replyCount must be a non-negative integer",
      Number.isInteger(comment.replyCount) && comment.replyCount >= 0,
    );
  }
}