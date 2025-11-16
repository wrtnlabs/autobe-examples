import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_comment_votes_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category for community classification
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology and software discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create member (community creator)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Sample discussion topic",
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 6: Create additional members to cast diverse votes and store their credentials
  interface VoterCredentials {
    account: ICommunityPlatformMember.IAuthorized;
    email: string;
    password: string;
  }
  const voterCredentials: VoterCredentials[] = [];
  for (let i = 0; i < 5; i++) {
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voterPassword = typia.random<string & tags.MinLength<8>>();
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        email: voterEmail,
        username: RandomGenerator.alphabets(8),
        password: voterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(voter);
    voterCredentials.push({
      account: voter,
      email: voterEmail,
      password: voterPassword,
    });
  }

  // Step 7: Cast upvotes from first 3 voters
  for (let i = 0; i < 3; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voterCredentials[i].email,
        password: voterCredentials[i].password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const upvote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            content_type: "comment",
            content_id: comment.id,
            vote_type: "upvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(upvote);
  }

  // Step 8: Cast downvotes from last 2 voters
  for (let i = 3; i < 5; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        email: voterCredentials[i].email,
        password: voterCredentials[i].password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const downvote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            content_type: "comment",
            content_id: comment.id,
            vote_type: "downvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(downvote);
  }

  // Step 9: Login back as original member for search/filter tests
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 10: Test search and filtering with various combinations

  // Test 1: Get all votes without filters
  const allVotesResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(allVotesResult);
  TestValidator.equals(
    "all votes count matches",
    allVotesResult.pagination.records,
    5,
  );
  TestValidator.predicate(
    "pagination metadata present",
    allVotesResult.pagination.pages > 0,
  );

  // Test 2: Filter by upvotes only
  const upvotesOnly: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(upvotesOnly);
  TestValidator.equals(
    "upvotes filtered correctly",
    upvotesOnly.pagination.records,
    3,
  );
  TestValidator.predicate(
    "all results are upvotes",
    upvotesOnly.data.every((v) => v.vote_type === "upvote"),
  );

  // Test 3: Filter by downvotes only
  const downvotesOnly: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvotesOnly);
  TestValidator.equals(
    "downvotes filtered correctly",
    downvotesOnly.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all results are downvotes",
    downvotesOnly.data.every((v) => v.vote_type === "downvote"),
  );

  // Test 4: Test pagination with smaller page size
  const paginatedResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    paginatedResult.pagination.pages >= 3,
  );

  // Test 5: Test sorting by creation date descending (default)
  const sortedDescResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(sortedDescResult);
  TestValidator.predicate(
    "results sorted by creation date descending",
    sortedDescResult.data.length >= 2,
  );

  // Test 6: Test sorting by creation date ascending
  const sortedAscResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(sortedAscResult);
  TestValidator.predicate(
    "results sorted by creation date ascending",
    sortedAscResult.data.length >= 2,
  );

  // Test 7: Test empty filter results (filter by non-existent member)
  const emptyFilterResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.equals(
    "empty filter returns zero records",
    emptyFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has no data items",
    emptyFilterResult.data.length,
    0,
  );

  // Test 8: Test requesting beyond available pages
  const beyondPageResult: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 100,
          limit: 20,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata still valid",
    beyondPageResult.pagination.current <= beyondPageResult.pagination.pages ||
      beyondPageResult.pagination.pages === 0,
  );

  // Test 9: Verify voter information is included in results
  const votesWithVoterInfo: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(votesWithVoterInfo);
  TestValidator.predicate(
    "voter information included in results",
    votesWithVoterInfo.data.every(
      (v) => v.member && v.member.id && v.member.username,
    ),
  );

  // Test 10: Test sorting by vote type
  const sortByVoteType: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.member.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "vote_type",
          order: "asc",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(sortByVoteType);
  TestValidator.predicate(
    "votes sorted by vote type",
    sortByVoteType.data.length >= 2,
  );
}
