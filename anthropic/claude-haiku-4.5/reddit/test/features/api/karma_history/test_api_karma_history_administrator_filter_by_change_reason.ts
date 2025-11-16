import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test filtering karma history records by change reason for administrative
 * auditing.
 *
 * This test validates the administrator's ability to filter and investigate
 * specific types of karma changes. It demonstrates:
 *
 * - Creating voting activities that generate karma history records
 * - Filtering history by change reason type
 * - Verifying filtered results only contain matching records
 * - Testing complex queries with multiple filter parameters
 * - Validating response consistency across different filter combinations
 *
 * Steps:
 *
 * 1. Administrator authenticates and gains comprehensive karma history access
 * 2. Member authenticates to generate karma history through voting
 * 3. Create a post to receive votes
 * 4. Create votes (upvote/downvote) generating 'vote_created' karma changes
 * 5. Filter karma history by 'vote_created' reason and validate results
 * 6. Combine member_id and change_reason filters for complex queries
 * 7. Verify pagination structure remains consistent across all filters
 */
export async function test_api_karma_history_administrator_filter_by_change_reason(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost/admin",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Member authentication to generate karma history
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost/register",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a post that can receive votes
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create upvote to generate 'vote_created' karma history
  const upvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(upvote);

  // Create downvote to generate additional 'vote_created' records
  const downvote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(downvote);

  // Step 5: Filter karma history by 'vote_created' change reason
  const voteCreatedHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(voteCreatedHistory);
  typia.assert(voteCreatedHistory.pagination);

  // Verify all returned records have 'vote_created' reason
  TestValidator.predicate(
    "all filtered records should have vote_created reason",
    () =>
      voteCreatedHistory.data.every(
        (record) => record.change_reason === "vote_created",
      ),
  );

  // Verify pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    () =>
      voteCreatedHistory.pagination.current >= 0 &&
      voteCreatedHistory.pagination.limit >= 0 &&
      voteCreatedHistory.pagination.records >= 0 &&
      voteCreatedHistory.pagination.pages >= 0,
  );

  // Step 6: Test filtering by member_id and change_reason together
  const combinedFilterHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: member.id,
          change_reason: "vote_created",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(combinedFilterHistory);

  // Verify combined filter results contain only matching records
  TestValidator.predicate(
    "all records should match both member_id and change_reason filters",
    () =>
      combinedFilterHistory.data.every(
        (record) =>
          record.member.id === member.id &&
          record.change_reason === "vote_created",
      ),
  );

  // Step 7: Verify response structure consistency
  TestValidator.predicate(
    "response structure should be consistent",
    () =>
      voteCreatedHistory.pagination !== undefined &&
      Array.isArray(voteCreatedHistory.data),
  );

  // Step 8: Verify data integrity of karma history records
  TestValidator.predicate(
    "each karma history record should have required fields",
    () =>
      voteCreatedHistory.data.every(
        (record) =>
          record.id !== undefined &&
          record.member !== undefined &&
          record.change_reason === "vote_created" &&
          typeof record.karma_change === "number" &&
          typeof record.previous_total === "number" &&
          typeof record.new_total === "number" &&
          record.created_at !== undefined,
      ),
  );

  // Step 9: Test pagination limit is respected
  const paginatedHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "vote_created",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(paginatedHistory);

  TestValidator.predicate(
    "pagination limit should be respected",
    () => paginatedHistory.data.length <= 5,
  );

  // Step 10: Test filtering without change_reason to verify all records are accessible
  const allHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allHistory);

  TestValidator.predicate(
    "unfiltered query should return valid response",
    () => Array.isArray(allHistory.data) && allHistory.pagination !== undefined,
  );
}
