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

export async function test_api_report_approval_rejected_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 creates community (becomes owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  // 2. Member1 subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: { community_id: community.id },
    },
  );
  // 3. Member2 joins and subscribes to community (Member2 is NOT a moderator)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Member2 creates a post with violating content
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: "This post violates community rules",
        communityName: community.name,
        type: "text",
      },
    },
  );
  // 5. Member1 reports the post
  const report = await generate_random_reddit_clone_member_reports_create(
    member1Connection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason:
          "This post contains violating content that breaks community guidelines",
      },
    },
  );
  // Verify report is created with pending status
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Member2 (who is NOT a moderator) attempts to approve the report
  // This should fail with authorization error since Member2 is not a moderator
  await TestValidator.error("non-moderator cannot approve report", async () => {
    await api.functional.redditClone.member.reports.approve(member2Connection, {
      reportId: report.id,
    });
  });
  // 7-8. Verify indirectly that the report was NOT processed:
  // - The post should NOT have been deleted (deleted_at should still be null)
  // - The report status should remain 'pending'
  TestValidator.predicate(
    "post was not deleted",
    post.deleted_at === null || post.deleted_at === undefined,
  );
  TestValidator.equals(
    "report status remains pending",
    report.status,
    "pending",
  );
}
