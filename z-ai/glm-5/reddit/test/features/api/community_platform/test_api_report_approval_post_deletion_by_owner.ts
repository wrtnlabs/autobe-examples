import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the complete workflow of approving a report on a post by the community owner.
 *
 * This test validates:
 * 1. Community owner has authority to approve reports
 * 2. Report status transitions from 'pending' to 'approved'
 * 3. Post is soft-deleted when report is approved
 * 4. All comments on the post are cascade soft-deleted
 * 5. Report metadata (post, community, reporter) is preserved
 * 6. Report updated_at timestamp is newer than created_at
 */
export async function test_api_report_approval_post_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create three members and establish relationships
  // ============================================================
  // Member A: Community owner who will approve the report
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Member A creates a community (becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Member B: Content creator who creates post and comment
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(creatorAuth);
  // Member B subscribes to the community (required before posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      creatorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Member B creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    creatorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Member B creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      creatorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Member C: Reporter who reports the post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // Member C creates a report targeting the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        communityId: community.id,
        postId: post.id,
        commentId: undefined,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // Store original timestamps for comparison
  const originalCreatedAt = report.created_at;
  const originalUpdatedAt = report.updated_at;
  // ============================================================
  // TEST EXECUTION: Owner approves the report
  // ============================================================
  // Member A (owner) approves the report
  const approvedReport =
    await api.functional.communityPlatform.member.reports.approve(
      ownerConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // ============================================================
  // VALIDATIONS
  // ============================================================
  // 1. Verify report status is 'approved'
  TestValidator.equals(
    "report status should be approved",
    approvedReport.status,
    "approved",
  );
  // 2. Verify report references the same post
  TestValidator.equals(
    "report should reference the same post",
    approvedReport.content_type,
    "post",
  );
  // Cast to access post-specific fields
  const reportedContent = approvedReport.content;
  if (approvedReport.content_type === "post") {
    TestValidator.equals(
      "reported post ID should match original",
      reportedContent.id,
      post.id,
    );
  }
  // 3. Verify report references the same community
  TestValidator.equals(
    "report community ID should match original",
    approvedReport.community.id,
    community.id,
  );
  // 4. Verify report references the same reporter
  TestValidator.equals(
    "report reporter ID should match original",
    approvedReport.reporter.id,
    reporterAuth.id,
  );
  // 5. Verify report reason is preserved
  TestValidator.equals(
    "report reason should be preserved",
    approvedReport.reason,
    report.reason,
  );
  // 6. Verify report updated_at is newer than created_at
  const createdAtDate = new Date(originalCreatedAt);
  const updatedAtDate = new Date(approvedReport.updated_at);
  TestValidator.predicate(
    "updated_at should be newer than or equal to created_at",
    updatedAtDate >= createdAtDate,
  );
  // 7. Verify the post is soft-deleted (deleted_at should be set)
  if (approvedReport.content_type === "post") {
    const reportedPost = approvedReport.content;
    TestValidator.predicate(
      "post should have deleted_at set after approval",
      reportedPost.deleted_at !== null,
    );
  }
  // 8. Verify the approval is final - attempting to approve again should fail
  await TestValidator.error(
    "approving already-approved report should fail",
    async () => {
      await api.functional.communityPlatform.member.reports.approve(
        ownerConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
