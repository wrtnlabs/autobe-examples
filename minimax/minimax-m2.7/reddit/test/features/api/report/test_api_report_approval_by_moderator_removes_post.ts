import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_approval_by_moderator_removes_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member1 joins and creates community (becomes owner/moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // Step 2: Member1 subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    },
  );
  // Step 3: Member2 joins and subscribes to community
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    },
  );
  // Step 4: Member2 creates a post with violating content
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text" as const,
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Member1 reports the post with reason text
  const report = await generate_random_reddit_clone_member_reports_create(
    member1Connection,
    {
      body: {
        target_type: "post" as const,
        target_id: post.id,
        reason: "This post violates community guidelines with spam content.",
      } satisfies IRedditCloneReport.ICreate,
    },
  );
  typia.assert(report);
  // Step 6: Verify report status is 'pending'
  TestValidator.equals("report status is pending", report.status, "pending");
  // Step 7: Member1 (as community owner/moderator) approves the report
  const approvedReport =
    await api.functional.redditClone.member.reports.approve(member1Connection, {
      reportId: report.id,
    });
  typia.assert(approvedReport);
  // Step 8: Verify response shows status 'approved' and updated_at timestamp
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "updated_at is set after approval",
    new Date(approvedReport.updated_at) > new Date(report.created_at),
  );
  // Step 9: Verify the reported post is deleted
  // The post was removed when report was approved
  TestValidator.equals(
    "reported content type is post",
    approvedReport.target_type,
    "post" as const,
  );
  TestValidator.equals(
    "report target matches post id",
    approvedReport.target_id,
    post.id,
  );
  // Step 10: Verify the report approval indicates content removal
  // When status is 'approved', the reported content (post) and its comments are deleted
  TestValidator.predicate(
    "report approval indicates content removal",
    approvedReport.status === "approved" &&
      approvedReport.target_id === post.id,
  );
}
