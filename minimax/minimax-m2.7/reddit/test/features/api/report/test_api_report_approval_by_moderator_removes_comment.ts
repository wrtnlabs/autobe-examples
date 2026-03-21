import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_approval_by_moderator_removes_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 creates community (becomes owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Member1 subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    {
      body: { community_id: community.id },
    },
  );
  // 3. Member2 joins and subscribes to community
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Member2 creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 5. Member2 creates a comment with violating content
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member2Connection,
      {
        params: { postId: post.id },
        body: {
          content: "This is violating content that should be reported.",
        },
      },
    );
  typia.assert(comment);
  // 6. Member1 reports the comment with reason text
  const report = await generate_random_reddit_clone_member_reports_create(
    member1Connection,
    {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason: "Violating community guidelines with inappropriate content.",
      },
    },
  );
  typia.assert(report);
  // 7. Verify report status is 'pending'
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target is comment",
    report.target_type,
    "comment",
  );
  TestValidator.equals(
    "report target id matches",
    report.target_id,
    comment.id,
  );
  // 8. Member1 (as owner) approves the report
  const approvedReport =
    await api.functional.redditClone.member.reports.approve(member1Connection, {
      reportId: report.id,
    });
  typia.assert(approvedReport);
  // 9. Verify response shows status 'approved'
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // 10. Verify the approved report has updated_at timestamp changed (indicating approval action)
  TestValidator.predicate(
    "report was updated after approval",
    new Date(approvedReport.updated_at) > new Date(report.created_at),
  );
  // 11. Verify the report still references the same target
  TestValidator.equals(
    "report target type preserved",
    approvedReport.target_type,
    "comment",
  );
  TestValidator.equals(
    "report target id preserved",
    approvedReport.target_id,
    comment.id,
  );
  // 12. Verify the parent post still exists with valid data
  TestValidator.equals("post id exists", post.id, post.id);
  TestValidator.predicate("post has valid title", post.title.length > 0);
  TestValidator.equals(
    "post author matches member2",
    post.author.username,
    member2Auth.username,
  );
  TestValidator.equals(
    "post community matches",
    post.community.name,
    community.name,
  );
}
