import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test submitting a content report with detailed optional context to provide
 * moderators with comprehensive information about the violation.
 *
 * This test validates the complete content reporting workflow including:
 *
 * 1. Member registration for content creation
 * 2. Community creation to provide context
 * 3. Post creation that will be reported
 * 4. Content report submission with detailed contextual explanation
 * 5. Validation that optional context is properly captured and transmitted
 *
 * The test ensures that detailed context enhances report quality and moderator
 * understanding by providing specific violation categories and comprehensive
 * explanations.
 */
export async function test_api_content_report_with_detailed_context(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert<IRedditLikeMember.IAuthorized>(member);

  // Step 2: Create community context
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert<IRedditLikeCommunity>(community);

  // Step 3: Create post to report with detailed context
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert<IRedditLikePost>(post);

  // Step 4: Submit content report with detailed contextual explanation
  const violationCategories = "spam,harassment,misinformation";
  const detailedContext =
    "This post contains multiple violations including promotional spam with external links to commercial websites, targeted harassment against specific community members by name, and deliberate spread of misinformation about public health topics. The content repeatedly promotes unauthorized commercial products, uses inflammatory language to attack other users, and cites debunked claims without credible sources. This pattern of behavior has been observed across multiple posts by this user, suggesting intentional manipulation rather than genuine community participation. Moderators should review the user's posting history for additional context.";

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: violationCategories,
        additional_context: detailedContext,
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert<IRedditLikeContentReport>(report);

  // Step 5: Validate that the optional context field is captured correctly
  TestValidator.equals(
    "content report should have matching post ID",
    report.content_type,
    "post",
  );
  TestValidator.equals(
    "violation categories should match submitted value",
    report.violation_categories,
    violationCategories,
  );
  TestValidator.equals(
    "detailed context should be captured correctly",
    report.additional_context,
    detailedContext,
  );
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.predicate(
    "report should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
  );
}
