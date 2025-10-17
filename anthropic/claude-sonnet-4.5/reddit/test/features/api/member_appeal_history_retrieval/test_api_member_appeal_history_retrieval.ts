import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationAppeal";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_member_appeal_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for submitting and retrieving appeals
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Create member connection with their token
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member.token.access,
    },
  };

  // Step 2: Create moderator account for taking moderation actions
  const moderatorData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Create moderator connection with their token
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: moderator.token.access,
    },
  };

  // Step 3: Create community for content creation context (use member connection)
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Create multiple posts that will be moderated
  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(5, async () => {
    const postData = {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 15,
      }),
    } satisfies IRedditLikePost.ICreate;

    const post: IRedditLikePost =
      await api.functional.redditLike.member.posts.create(memberConnection, {
        body: postData,
      });
    typia.assert(post);
    return post;
  });

  // Step 5: Submit content reports triggering moderation actions
  const reports: IRedditLikeContentReport[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const reportData = {
        reported_post_id: posts[index].id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeContentReport.ICreate;

      const report: IRedditLikeContentReport =
        await api.functional.redditLike.content_reports.create(
          memberConnection,
          {
            body: reportData,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Create moderation actions (content removals) using moderator connection
  const moderationActions: IRedditLikeModerationAction[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const actionData = {
        report_id: reports[index].id,
        affected_post_id: posts[index].id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
        internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeModerationAction.ICreate;

      const action: IRedditLikeModerationAction =
        await api.functional.redditLike.moderation.actions.create(
          moderatorConnection,
          {
            body: actionData,
          },
        );
      typia.assert(action);
      return action;
    });

  // Step 7: Submit multiple appeals using member connection
  const appeals: IRedditLikeModerationAppeal[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const appealData = {
        moderation_action_id: moderationActions[index].id,
        appeal_type: "content_removal",
        appeal_text: typia.random<
          string & tags.MinLength<50> & tags.MaxLength<1000>
        >(),
      } satisfies IRedditLikeModerationAppeal.ICreate;

      const appeal: IRedditLikeModerationAppeal =
        await api.functional.redditLike.member.moderation.appeals.create(
          memberConnection,
          {
            body: appealData,
          },
        );
      typia.assert(appeal);
      return appeal;
    },
  );

  // Step 8: Test retrieval of all member's appeals with no filters
  const allAppealsRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditLikeModerationAppeal.IRequest;

  const allAppealsPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      memberConnection,
      {
        body: allAppealsRequest,
      },
    );
  typia.assert(allAppealsPage);

  TestValidator.equals(
    "all appeals count should match created appeals",
    allAppealsPage.data.length,
    appeals.length,
  );
  TestValidator.predicate(
    "pagination records should be correct",
    allAppealsPage.pagination.records >= appeals.length,
  );

  // Step 9: Verify each appeal contains required fields
  for (const appeal of allAppealsPage.data) {
    TestValidator.predicate(
      "appeal should have appeal_type",
      appeal.appeal_type === "content_removal",
    );
    TestValidator.predicate(
      "appeal should have status",
      typeof appeal.status === "string" && appeal.status.length > 0,
    );
    TestValidator.predicate(
      "appeal should have created_at timestamp",
      typeof appeal.created_at === "string",
    );
    TestValidator.predicate(
      "appeal should have expected_resolution_at timestamp",
      typeof appeal.expected_resolution_at === "string",
    );
    TestValidator.equals(
      "appeal should belong to member",
      appeal.appellant_member_id,
      member.id,
    );
  }

  // Step 10: Test filtering by status (pending)
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    status: "pending",
  } satisfies IRedditLikeModerationAppeal.IRequest;

  const statusFilteredPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      memberConnection,
      {
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFilteredPage);

  for (const appeal of statusFilteredPage.data) {
    TestValidator.equals(
      "filtered appeals should have pending status",
      appeal.status,
      "pending",
    );
  }

  // Step 11: Test filtering by appeal_type
  const appealTypeFilterRequest = {
    page: 1,
    limit: 10,
    appeal_type: "content_removal",
  } satisfies IRedditLikeModerationAppeal.IRequest;

  const appealTypeFilteredPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      memberConnection,
      {
        body: appealTypeFilterRequest,
      },
    );
  typia.assert(appealTypeFilteredPage);

  for (const appeal of appealTypeFilteredPage.data) {
    TestValidator.equals(
      "filtered appeals should have content_removal type",
      appeal.appeal_type,
      "content_removal",
    );
  }

  // Step 12: Test filtering by escalation status (is_escalated false)
  const escalationFilterRequest = {
    page: 1,
    limit: 10,
    is_escalated: false,
  } satisfies IRedditLikeModerationAppeal.IRequest;

  const escalationFilteredPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      memberConnection,
      {
        body: escalationFilterRequest,
      },
    );
  typia.assert(escalationFilteredPage);

  for (const appeal of escalationFilteredPage.data) {
    TestValidator.equals(
      "filtered appeals should not be escalated",
      appeal.is_escalated,
      false,
    );
  }

  // Step 13: Test pagination controls with smaller page size
  const paginationRequest = {
    page: 1,
    limit: 2,
  } satisfies IRedditLikeModerationAppeal.IRequest;

  const firstPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      memberConnection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.predicate(
    "first page should have at most 2 appeals",
    firstPage.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );

  // Step 14: Test second page
  const secondPageRequest = {
    page: 2,
    limit: 2,
  } satisfies IRedditLikeModerationAppeal.IRequest;

  const secondPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      memberConnection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );

  // Step 15: Verify privacy - create another member and ensure they cannot see first member's appeals
  const otherMemberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const otherMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: otherMemberData,
    });
  typia.assert(otherMember);

  const otherMemberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: otherMember.token.access,
    },
  };

  const otherMemberAppealsPage: IPageIRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.index(
      otherMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationAppeal.IRequest,
      },
    );
  typia.assert(otherMemberAppealsPage);

  TestValidator.equals(
    "other member should have no appeals",
    otherMemberAppealsPage.data.length,
    0,
  );
}
