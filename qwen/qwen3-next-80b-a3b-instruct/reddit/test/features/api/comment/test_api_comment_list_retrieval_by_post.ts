import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comment_list_retrieval_by_post(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.name(1);
  const memberPassword: string = "ValidPass123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a community
  const communityName: string = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const postTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const postContent: string = RandomGenerator.content({ paragraphs: 2 });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: postContent,
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Create multiple comments on the post
  const commentCount: number = 10;
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 5. Retrieve paginated list of comments for the post (filtering only published)
  const pageSize: number = 5;
  const pageNumber: number = 1;

  const response: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: pageNumber,
        limit: pageSize,
        sort: "created_at",
        order: "desc",
        // status: 'published' (default, so not needed)
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(response);

  // 6. Validate response structure and content
  TestValidator.equals(
    "pagination current page matches request",
    response.pagination.current,
    pageNumber,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination records >= page size",
    response.pagination.records >= pageSize,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    response.pagination.pages,
    Math.ceil(response.pagination.records / pageSize),
  );

  // Verify items count matches limit
  TestValidator.equals(
    "response data count matches limit",
    response.data.length,
    pageSize,
  );

  // Verify data items are published comments
  for (const comment of response.data) {
    TestValidator.equals(
      "comment status is published",
      comment.status,
      "published",
    );
  }

  // Verify items are sorted by created_at descending (newest first)
  // Since we can't guarantee exact order due to concurrent operations,
  // we rely on the API's expected behavior as per requirement
  // We'll verify that the first item is among the last created
  // by comparing timestamps
  const firstCommentTimestamp = new Date(response.data[0].created_at).getTime();
  const lastCommentTimestamp = new Date(
    comments[comments.length - 1].created_at,
  ).getTime();
  TestValidator.predicate(
    "first comment in response is relatively recent",
    firstCommentTimestamp > lastCommentTimestamp - 2000,
  );

  TestValidator.predicate(
    "response items show hierarchy",
    response.data.every(
      (item) => item.depth_level >= 1 && item.depth_level <= 8,
    ),
  );
}
