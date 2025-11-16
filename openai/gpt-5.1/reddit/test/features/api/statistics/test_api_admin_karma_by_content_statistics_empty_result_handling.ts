import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaByContentStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatistics";
import type { ICommunityPlatformKarmaByContentStatisticsTopComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatisticsTopComment";
import type { ICommunityPlatformKarmaByContentStatisticsTopPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatisticsTopPost";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaByContentStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaByContentStatistics";

/**
 * Validate that admin karma-by-content statistics handle filter-driven empty
 * result sets correctly.
 *
 * Business goal: Ensure that when an admin queries content-level karma
 * analytics with filters that exclude all existing posts and comments, the
 * endpoint returns a well-formed empty page instead of errors or malformed
 * pagination data.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser and obtain an authorized admin session.
 * 2. Register a memberUser that will own content.
 * 3. As the memberUser, create a community.
 * 4. As the memberUser, join the community (create membership).
 * 5. As the memberUser, create at least one post in that community.
 * 6. Optionally create a comment and some votes on the post/comment so the system
 *    clearly has data, but all of it will be excluded by filters.
 * 7. Switch back to the adminUser context via login.
 * 8. Call PATCH /communityPlatform/adminUser/statistics/karma/byContent with
 *    filters that:
 *
 *    - Use a communityIds array containing a UUID different from the created
 *         community.id,
 *    - And an authorIds array containing a UUID different from the created
 *         memberUser.id,
 *    - And set minScore to a very high value. with page=1, limit=20, sortBy="score",
 *         sortDirection="desc".
 * 9. Assert that the response is a valid
 *    IPageICommunityPlatformKarmaByContentStatistics.ISummary via
 *    typia.assert.
 * 10. Assert via TestValidator that:
 *
 *     - Pagination.records === 0,
 *     - Pagination.pages === 0,
 *     - Data.length === 0,
 *     - Pagination.current === 1 and pagination.limit === 20.
 */
export async function test_api_admin_karma_by_content_statistics_empty_result_handling(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join) to get authorized admin context
  const adminUsername = RandomGenerator.alphabets(12);
  const adminPassword = "AdminPass123!";
  const adminEmail = `admin_${RandomGenerator.alphabets(8)}@example.com`;

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register memberUser and get authorized context
  const memberUsername = RandomGenerator.alphabets(12);
  const memberPassword = "MemberPass123";
  const memberEmail =
    `member_${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: memberUsername as string & tags.MinLength<3> & tags.MaxLength<32>,
    email: memberEmail,
    password: memberPassword as string & tags.MinLength<8>,
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.name() as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as
      | (string & tags.MaxLength<4000>)
      | null
      | undefined,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, join the community (membership)
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 5. As memberUser, create at least one post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Optionally create a comment and some votes
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteCreateBody,
      },
    );
  typia.assert(postVote);

  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(commentVote);

  // 7. Switch back to adminUser via login to ensure admin actor context
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/admin" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. Call PATCH /communityPlatform/adminUser/statistics/karma/byContent
  //    with filters that guarantee an empty result set
  const nonExistingCommunityId = typia.random<string & tags.Format<"uuid">>();
  const nonExistingAuthorId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    communityIds: [nonExistingCommunityId],
    authorIds: [nonExistingAuthorId],
    contentTypes: ["post", "comment"],
    minScore: 1_000_000 as number & tags.Type<"int32">,
    maxScore: undefined,
    minVoteCount: undefined,
    createdFrom: null,
    createdTo: null,
    sortBy: "score" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByContentStatistics.IRequest;

  const pageResult: IPageICommunityPlatformKarmaByContentStatistics.ISummary =
    await api.functional.communityPlatform.adminUser.statistics.karma.byContent.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 9. Type assertion
  typia.assert<IPageICommunityPlatformKarmaByContentStatistics.ISummary>(
    pageResult,
  );

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 10. Business assertions on pagination and data emptiness
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit should echo 20", pagination.limit, 20);
  TestValidator.equals(
    "no records should match filtered analytics",
    pagination.records,
    0,
  );
  TestValidator.equals(
    "no pages should be reported when there are no records",
    pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty when no content matches filters",
    pageResult.data.length,
    0,
  );

  // 11. Additional predicate to ensure structure is consistent with empty semantics
  TestValidator.predicate(
    "analytics page for empty result should still be an object with pagination and data fields",
    pageResult !== null &&
      pageResult !== undefined &&
      Array.isArray(pageResult.data),
  );
}
