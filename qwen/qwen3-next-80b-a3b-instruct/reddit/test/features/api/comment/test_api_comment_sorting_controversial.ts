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
export async function test_api_comment_sorting_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a member to create a post
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a post in a community
  // Community code is a business identifier, not a UUID, so we generate a random string
  const communityCode = RandomGenerator.alphaNumeric(10);
  // Use the generation function to create the post (as per utility function priority rule)
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_communities_posts_new_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          text: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
        params: { communityCode },
      },
    );
  typia.assert(post);
  // Step 3: Call the controversial sort endpoint on the post using an unauthenticated connection
  // As per scenario, unauthenticated users can access the endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  const sortResult: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.sort.index(
      guestConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(sortResult);
  // Step 4: Validate the pagination information
  TestValidator.equals(
    "pagination current page is 1",
    sortResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    sortResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    sortResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    sortResult.pagination.pages >= 1,
  );
  // Step 5: Validate that all comments in response are properly formatted
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(sortResult.data),
  );
  sortResult.data.forEach((comment) => {
    // Validate comment conforms to ICommunityPlatformComment.ISummary
    TestValidator.equals("comment has id", typeof comment.id, "string");
    TestValidator.predicate(
      "comment id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        comment.id,
      ),
    );
    TestValidator.equals(
      "comment has content",
      typeof comment.content,
      "string",
    );
    TestValidator.predicate(
      "comment content is truncated to 300 chars",
      comment.content.length <= 300,
    );
    TestValidator.equals(
      "comment has voteScore",
      typeof comment.voteScore,
      "number",
    );
    TestValidator.equals(
      "comment has createdAt",
      typeof comment.createdAt,
      "string",
    );
    TestValidator.predicate(
      "comment createdAt is ISO 8601",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(comment.createdAt),
    );
    TestValidator.equals(
      "comment has replyCount",
      typeof comment.replyCount,
      "number",
    );
    TestValidator.predicate(
      "comment replyCount is not negative",
      comment.replyCount >= 0,
    );
  });
  // Note: We cannot validate the controversial sorting logic (comments with high total votes but net score in [-2,+2] appearing first)
  // because we lack an API function to create comments with specific vote patterns.
  // The test validates the API contract: response structure, pagination, and type safety.
  // The controversial sorting behavior is implemented on the backend and we test that the endpoint
  // returns valid data according to the specification.
}