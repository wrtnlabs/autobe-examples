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
export async function test_api_comment_sorting_new(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate authentication credentials for member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberCredentials: ICommunityPlatformMember.IJoin = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMember.IJoin;
  // Step 2: Create a member account and obtain authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCredentials });
  // memberConnection.headers now contains authorization token
  // Step 3: Create a community code for the post
  const communityCode: string = RandomGenerator.alphaNumeric(8);
  // Step 4: Create a post in the community using the available endpoint
  const postCreateData: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    text: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ICommunityPlatformPost.ICreate;
  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts._new.create(
      memberConnection,
      {
        communityCode,
        body: postCreateData,
      },
    );
  typia.assert(createdPost);
  // Step 5: Get comments sorted by 'new' criterion using anonymous connection
  // Since there is NO api function to create comments, we're testing the endpoint with an existing post
  // The post may have 0 comments already, which is acceptable for validation
  const commentConnection: api.IConnection = { host: connection.host }; // Anonymous connection
  const sortedCommentsResponse: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.sort.index(
      commentConnection,
      {
        postId: createdPost.id,
        body: { sort: "new", limit: 10, offset: 0 },
      },
    );
  typia.assert(sortedCommentsResponse);
  // Step 6: Validate response structure for IPageICommunityPlatformComment.ISummary format
  TestValidator.equals(
    "response has pagination object",
    typeof sortedCommentsResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(sortedCommentsResponse.data),
    true,
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    sortedCommentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    sortedCommentsResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is numeric",
    typeof sortedCommentsResponse.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is numeric",
    typeof sortedCommentsResponse.pagination.pages,
    "number",
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sortedCommentsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sortedCommentsResponse.pagination.pages >= 0,
  );
  // Validate data structure and types
  for (const comment of sortedCommentsResponse.data) {
    // Validate comment ISummary structure
    TestValidator.equals("comment has id", typeof comment.id, "string");
    TestValidator.predicate(
      "id is UUID format",
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
      "content is truncated to 300 characters",
      comment.content.length <= 300,
    );
    TestValidator.equals(
      "comment has voteScore",
      typeof comment.voteScore,
      "number",
    );
    TestValidator.predicate(
      "voteScore is integer",
      Number.isInteger(comment.voteScore),
    );
    TestValidator.equals(
      "comment has createdAt",
      typeof comment.createdAt,
      "string",
    );
    TestValidator.predicate(
      "createdAt is ISO 8601 format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d{3})?Z$/.test(
        comment.createdAt,
      ),
    );
    TestValidator.equals(
      "comment has replyCount",
      typeof comment.replyCount,
      "number",
    );
    TestValidator.predicate(
      "replyCount is non-negative integer",
      comment.replyCount >= 0 && Number.isInteger(comment.replyCount),
    );
  }
}
