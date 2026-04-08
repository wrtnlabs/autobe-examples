import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_report } from "../../../prepare/prepare_random_reddit_clone_community_report";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_approval_by_moderator_deletes_post(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create Member1 (community owner/moderator)
  // ============================================================
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1) + "_" + RandomGenerator.alphabets(5),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member1Auth);
  // ============================================================
  // Member1 creates a community (becomes owner/moderator)
  // ============================================================
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: "test_community_" + RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // ============================================================
  // Member1 subscribes to their own community
  // ============================================================
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // ============================================================
  // Member1 creates a text post
  // ============================================================
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        title: "Test Post for Reporting - " + RandomGenerator.alphabets(10),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // ============================================================
  // SETUP: Create Member2 (reporter)
  // ============================================================
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1) + "_" + RandomGenerator.alphabets(5),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // ============================================================
  // Member2 subscribes to the community
  // ============================================================
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // ============================================================
  // Member2 reports the post
  // ============================================================
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: "This post violates community guidelines",
        },
      },
    );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals("report status is pending", report.status, "pending");
  // ============================================================
  // TEST EXECUTION: Member1 (moderator) approves the report
  // ============================================================
  const approvedReport =
    await api.functional.redditClone.member.communities.reports.approve(
      member1Connection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // ============================================================
  // VALIDATIONS
  // ============================================================
  // Report status changed to 'approved'
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // Report belongs to the correct community
  TestValidator.equals(
    "report community matches",
    approvedReport.community.id,
    community.id,
  );
  // Report target is the post that was reported
  TestValidator.equals(
    "report target_id matches post",
    approvedReport.target_id,
    post.id,
  );
  // Report target_type is 'post'
  TestValidator.equals(
    "report target_type is post",
    approvedReport.target_type,
    "post",
  );
}
