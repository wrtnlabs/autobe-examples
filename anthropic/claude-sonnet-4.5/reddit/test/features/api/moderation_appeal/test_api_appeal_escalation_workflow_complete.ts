import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_appeal_escalation_workflow_complete(
  connection: api.IConnection,
) {
  // Step 1: Member creates account and community
  const memberConnection: api.IConnection = { ...connection };

  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 4: Report the content (can be done by anyone, using fresh connection)
  const reportConnection: api.IConnection = { ...connection, headers: {} };

  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IRedditLikeContentReport.ICreate;

  const report = await api.functional.redditLike.content_reports.create(
    reportConnection,
    {
      body: reportData,
    },
  );
  typia.assert(report);

  // Step 5: Moderator joins (using separate connection)
  const moderatorConnection: api.IConnection = { ...connection };

  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(
    moderatorConnection,
    {
      body: moderatorData,
    },
  );
  typia.assert(moderator);

  // Step 6: Moderator removes the content
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community-level",
    reason_category: "spam",
    reason_text:
      "This content violates community spam policies with detailed explanation",
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(
      moderatorConnection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Member submits appeal (using member connection)
  const appealData = {
    moderation_action_id: moderationAction.id,
    appeal_type: "content_removal",
    appeal_text: typia.random<
      string & tags.MinLength<50> & tags.MaxLength<1000>
    >(),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      memberConnection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);

  TestValidator.equals(
    "appeal initially not escalated",
    appeal.is_escalated,
    false,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Step 8: Moderator reviews and denies the appeal
  const reviewData = {
    decision: "uphold",
    decision_explanation: typia.random<string & tags.MinLength<30>>(),
  } satisfies IRedditLikeModerationAppeal.IReview;

  const reviewedAppeal =
    await api.functional.redditLike.moderator.moderation.appeals.review(
      moderatorConnection,
      {
        appealId: appeal.id,
        body: reviewData,
      },
    );
  typia.assert(reviewedAppeal);

  TestValidator.equals(
    "appeal status is upheld",
    reviewedAppeal.status,
    "upheld",
  );
  TestValidator.equals(
    "appeal still not escalated after review",
    reviewedAppeal.is_escalated,
    false,
  );

  // Step 9: Member escalates the denied appeal
  const escalatedAppeal =
    await api.functional.redditLike.member.moderation.appeals.escalate.postByAppealid(
      memberConnection,
      {
        appealId: reviewedAppeal.id,
      },
    );
  typia.assert(escalatedAppeal);

  // Step 10: Verify escalation worked correctly
  TestValidator.equals(
    "appeal is now escalated",
    escalatedAppeal.is_escalated,
    true,
  );
  TestValidator.equals(
    "escalated appeal ID matches",
    escalatedAppeal.id,
    appeal.id,
  );
  TestValidator.equals(
    "appellant member ID preserved",
    escalatedAppeal.appellant_member_id,
    appeal.appellant_member_id,
  );

  // Verify complete appeal history is preserved
  TestValidator.equals(
    "appeal type preserved",
    escalatedAppeal.appeal_type,
    "content_removal",
  );
  TestValidator.equals(
    "original appeal text preserved",
    escalatedAppeal.appeal_text,
    appeal.appeal_text,
  );

  // Verify expected resolution timeframe updated to 7-10 days
  const originalExpectedResolution = new Date(appeal.expected_resolution_at);
  const escalatedExpectedResolution = new Date(
    escalatedAppeal.expected_resolution_at,
  );
  const timeDifference =
    escalatedExpectedResolution.getTime() -
    originalExpectedResolution.getTime();
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "expected resolution timeframe extended appropriately",
    daysDifference >= 5 && daysDifference <= 10,
  );
}
