import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Validate that the global comments search endpoint isolates results by post.
 *
 * Business goal
 *
 * - When using PATCH /communityPlatform/search/comments with postId set in
 *   ICommunityPlatformComment.IRequest, only comments from that post should be
 *   returned, even if other posts contain comments with matching keywords.
 *
 * Scenario steps
 *
 * 1. Join as a member user and obtain authenticated context.
 * 2. Create a community.
 * 3. Create a membership for the user in that community.
 * 4. Create two posts in the same community (Post A and Post B).
 * 5. Create overlapping-keyword comments on both posts.
 * 6. Search with postId = Post A.id and a shared keyword; verify only Post A
 *    comments are returned.
 * 7. Repeat search with postId = Post B.id; verify only Post B comments are
 *    returned.
 * 8. Validate pagination metadata and summary structure of the search results.
 */
export async function test_api_search_comments_cross_post_isolation(
  connection: api.IConnection,
) {
  // 1. Register member user (join) to get authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a membership for the user in the community
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create two posts (Post A and Post B) in the same community
  const postABody = {
    communityId: community.id,
    communityCode: community.slug,
    title: `Post A ${RandomGenerator.paragraph({ sentences: 1 })}`,
    body: RandomGenerator.paragraph({ sentences: 5 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  const postBBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: `Post B ${RandomGenerator.paragraph({ sentences: 1 })}`,
    body: RandomGenerator.paragraph({ sentences: 5 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 5. Create overlapping-keyword comments on both posts
  const sharedKeyword = "sharedkeyword";

  // Helper to create a comment
  const createComment = async (
    postId: string & tags.Format<"uuid">,
    content: string,
  ): Promise<ICommunityPlatformComment> => {
    const body = {
      content,
    } satisfies ICommunityPlatformComment.ICreate;
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId,
          body,
        },
      );
    typia.assert(comment);
    return comment;
  };

  // Post A comments
  const commentA1 = await createComment(
    postA.id as string & tags.Format<"uuid">,
    `${sharedKeyword} first comment on post A`,
  );
  const commentA2 = await createComment(
    postA.id as string & tags.Format<"uuid">,
    `second ${sharedKeyword} comment on post A`,
  );
  const commentA3 = await createComment(
    postA.id as string & tags.Format<"uuid">,
    "unique content only on post A",
  );

  // Post B comments
  const commentB1 = await createComment(
    postB.id as string & tags.Format<"uuid">,
    `${sharedKeyword} first comment on post B`,
  );
  const commentB2 = await createComment(
    postB.id as string & tags.Format<"uuid">,
    `second ${sharedKeyword} comment on post B`,
  );
  const commentB3 = await createComment(
    postB.id as string & tags.Format<"uuid">,
    "unique content only on post B",
  );

  void commentA1;
  void commentA2;
  void commentA3;
  void commentB1;
  void commentB2;
  void commentB3;

  // 6. Search for comments of Post A only
  const searchBodyForPostA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    postId: postA.id as string & tags.Format<"uuid">,
    query: sharedKeyword,
    orderBy: "createdAtAsc" as const,
  } satisfies ICommunityPlatformComment.IRequest;

  const searchResultA: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(connection, {
      body: searchBodyForPostA,
    });
  typia.assert(searchResultA);

  // Basic pagination assertions for Post A search
  const paginationA = searchResultA.pagination;
  TestValidator.equals(
    "pagination current page should be 1 for post A search",
    paginationA.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested for post A search",
    paginationA.limit,
    20,
  );
  TestValidator.predicate(
    "records should be at least number of returned items for post A search",
    paginationA.records >= searchResultA.data.length,
  );
  TestValidator.predicate(
    "pages should be at least 1 for post A search",
    paginationA.pages >= 1,
  );

  // Ensure we got at least one comment for post A
  TestValidator.predicate(
    "search result for post A should contain at least one item",
    searchResultA.data.length > 0,
  );

  // Verify all comments are from Post A and none from Post B
  for (const summary of searchResultA.data) {
    TestValidator.equals(
      "each summary in post A search must belong to Post A",
      summary.post.id,
      postA.id,
    );
  }

  TestValidator.predicate(
    "no summary in post A search should belong to Post B",
    searchResultA.data.every((summary) => summary.post.id !== postB.id),
  );

  // 7. Search for comments of Post B only
  const searchBodyForPostB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    postId: postB.id as string & tags.Format<"uuid">,
    query: sharedKeyword,
    orderBy: "createdAtAsc" as const,
  } satisfies ICommunityPlatformComment.IRequest;

  const searchResultB: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.search.comments.index(connection, {
      body: searchBodyForPostB,
    });
  typia.assert(searchResultB);

  const paginationB = searchResultB.pagination;
  TestValidator.equals(
    "pagination current page should be 1 for post B search",
    paginationB.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested for post B search",
    paginationB.limit,
    20,
  );
  TestValidator.predicate(
    "records should be at least number of returned items for post B search",
    paginationB.records >= searchResultB.data.length,
  );
  TestValidator.predicate(
    "pages should be at least 1 for post B search",
    paginationB.pages >= 1,
  );

  TestValidator.predicate(
    "search result for post B should contain at least one item",
    searchResultB.data.length > 0,
  );

  for (const summary of searchResultB.data) {
    TestValidator.equals(
      "each summary in post B search must belong to Post B",
      summary.post.id,
      postB.id,
    );
  }

  TestValidator.predicate(
    "no summary in post B search should belong to Post A",
    searchResultB.data.every((summary) => summary.post.id !== postA.id),
  );
}
