import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

export async function test_api_voting_records_administrator_filter_by_date_range(
  connection: api.IConnection,
) {
  // 1. Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123",
        username: RandomGenerator.alphaNumeric(8),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Cast votes
  const vote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote1);

  const vote2: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote2);

  // 6. Define date ranges for filtering
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneHourMs = 60 * 60 * 1000;

  // Wide range that encompasses votes created around now
  const rangeStart = new Date(now.getTime() - oneDayMs);
  const rangeEnd = new Date(now.getTime() + oneHourMs);

  // 7. Query votes with date range filters (wide range)
  const votesInWideRange: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_after: rangeStart.toISOString(),
          created_before: rangeEnd.toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(votesInWideRange);

  // 8. Validate votes within range
  TestValidator.predicate(
    "wide range query returns votes",
    votesInWideRange.data.length > 0,
  );

  for (const vote of votesInWideRange.data) {
    const voteTime = new Date(vote.created_at);
    TestValidator.predicate(
      `vote created_at is at or after range start`,
      voteTime >= rangeStart,
    );
    TestValidator.predicate(
      `vote created_at is at or before range end`,
      voteTime <= rangeEnd,
    );
  }

  // 9. Query with created_after filter only
  const votesAfterFilter: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_after: rangeStart.toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(votesAfterFilter);

  for (const vote of votesAfterFilter.data) {
    const voteTime = new Date(vote.created_at);
    TestValidator.predicate(
      `vote respects created_after filter`,
      voteTime >= rangeStart,
    );
  }

  // 10. Query with created_before filter only
  const votesBeforeFilter: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_before: rangeEnd.toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(votesBeforeFilter);

  for (const vote of votesBeforeFilter.data) {
    const voteTime = new Date(vote.created_at);
    TestValidator.predicate(
      `vote respects created_before filter`,
      voteTime <= rangeEnd,
    );
  }

  // 11. Query with narrower range around current time
  const narrowStart = new Date(now.getTime() - oneHourMs);
  const narrowEnd = new Date(now.getTime() + 10 * 60 * 1000);

  const votesInNarrowRange: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_after: narrowStart.toISOString(),
          created_before: narrowEnd.toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(votesInNarrowRange);

  for (const vote of votesInNarrowRange.data) {
    const voteTime = new Date(vote.created_at);
    TestValidator.predicate(
      `vote in narrow range is within boundaries`,
      voteTime >= narrowStart && voteTime <= narrowEnd,
    );
  }

  // 12. Verify pagination structure
  TestValidator.predicate(
    "pagination current page is set",
    votesInWideRange.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is set",
    votesInWideRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is set",
    votesInWideRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is set",
    votesInWideRange.pagination.pages >= 0,
  );

  // 13. Verify data array matches pagination
  TestValidator.predicate(
    "data array respects pagination limit",
    votesInWideRange.data.length <= votesInWideRange.pagination.limit,
  );
}
