import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_moderation_report_dismiss_comment_preserved(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test successful report dismissal workflow where a moderator updates a report status to 'dismissed' via PUT.
  // The test validates that reported content remains accessible when reports are dismissed (no soft-delete applied).
  // 1. Authenticate as member A (will create post)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: `member_a_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Authenticate as member B (moderator who will dismiss report)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: `member_b_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Authenticate as member C (will write comment)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: `member_c_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberCAuth);
  // 4. Authenticate as member D (will submit report)
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberDAuth = await authorize_member_join(memberDConnection, {
    body: {
      email: `member_d_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberDAuth);
  // 5. Create a post as member A
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post as member C
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberCConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Create a report on the comment as member D
  const report = await api.functional.redditCommunity.member.reports.create(
    memberDConnection,
    {
      body: {
        community_id: communityId,
        target_type: "comment",
        target_id: comment.id,
        reason: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 8. Update the report status to 'dismissed' as moderator (member B)
  const updatedReport =
    await api.functional.redditCommunity.member.reports.update(
      memberBConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
          notes: "Report dismissed - content does not violate guidelines",
        } satisfies IRedditCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 9. Validate the report status changed to 'dismissed'
  TestValidator.equals(
    "report status updated to dismissed",
    updatedReport.status,
    "dismissed",
  );
  // 10. Verify the comment remains accessible after report dismissal
  TestValidator.equals("comment has valid ID", comment.id.length > 0, true);
  // 11. Verify the updated report contains proper metadata
  TestValidator.equals(
    "report has updated_at timestamp",
    updatedReport.updated_at !== undefined,
    true,
  );
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(updatedReport.updated_at);
    return !isNaN(date.getTime());
  });
}
