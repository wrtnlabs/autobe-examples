import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a community moderator can dismiss a pending content report, preserving the reported content.
 *
 * This test verifies the complete workflow of report dismissal by a moderator:
 * 1. Sets up a community with an owner/moderator
 * 2. Creates content (post and comment) by a member
 * 3. Submits a report against the comment by another member
 * 4. Moderator dismisses the report
 * 5. Validates that the reported content remains intact
 * 6. Confirms the report cannot be updated again after dismissal
 */
export async function test_api_report_update_dismiss_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner (who will be moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community owned by this member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Register second member who will create content
  const contentCreatorConnection: api.IConnection = { host: connection.host };
  const contentCreatorAuth = await authorize_member_join(
    contentCreatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(2),
        bio: null,
        avatar_uri: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(contentCreatorAuth);
  // 4. Second member creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    contentCreatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Second member creates a comment on that post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      contentCreatorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        },
      },
    );
  typia.assert(comment);
  // Store original comment state for later validation
  const originalCommentScore = comment.score;
  const originalCommentContent = comment.content;
  // 6. Register third member who will report the comment
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporterAuth);
  // 7. Third member submits a report against the comment
  const report = await generate_random_reddit_clone_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "comment",
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        comment_id: comment.id,
        post_id: null,
      },
    },
  );
  typia.assert(report);
  // Verify report is initially pending
  TestValidator.equals("report initial status", report.status, "pending");
  // 8. Moderator dismisses the report
  const updatedReport = await api.functional.redditClone.member.reports.update(
    ownerConnection,
    {
      reportId: report.id,
      body: {
        status: "dismissed",
      } satisfies IRedditCloneReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  // 9. Verify the report status is now 'dismissed'
  TestValidator.equals(
    "report status after dismiss",
    updatedReport.status,
    "dismissed",
  );
  // 10. Verify the reported comment still exists (check via the report's reportedComment)
  TestValidator.predicate(
    "reported comment exists",
    updatedReport.reportedComment !== null,
  );
  TestValidator.equals(
    "reported comment id matches",
    updatedReport.reportedComment!.id,
    comment.id,
  );
  // 11. Verify the report's updated_at timestamp was updated
  TestValidator.notEquals(
    "updated_at changed",
    report.updated_at,
    updatedReport.updated_at,
  );
  // 12. Verify the report cannot be updated again (attempting another PUT should fail)
  await TestValidator.error("cannot update dismissed report", async () => {
    await api.functional.redditClone.member.reports.update(ownerConnection, {
      reportId: report.id,
      body: {
        status: "approved",
      } satisfies IRedditCloneReport.IUpdate,
    });
  });
  // 13. Verify the comment's score and content remain unchanged
  TestValidator.equals(
    "comment score unchanged",
    updatedReport.reportedComment!.score,
    originalCommentScore,
  );
  TestValidator.equals(
    "comment content unchanged",
    updatedReport.reportedComment!.content,
    originalCommentContent,
  );
}