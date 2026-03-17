import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_approve_comment_content_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register the community owner ──────────────────────────────────
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerMember);
  // ── Step 2: Create a community (owner automatically has moderator authority) ──
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // ── Step 3: Register the second member (post/comment author) ─────────────
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorConnection, {});
  typia.assert(authorMember);
  // ── Step 4: Subscribe the author to the community ──────────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ── Step 5: Author creates a post in the community ─────────────────────────
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // ── Step 6: Author creates a top-level comment on the post ─────────────────
  const comment = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // ── Step 7: Author submits a report targeting the comment ──────────────────
  const report =
    await generate_random_community_member_communities_reports_create(
      authorConnection,
      {
        body: {
          comment_id: comment.id,
          post_id: null,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.equals("report targets comment", report.comment !== null, true);
  TestValidator.equals("report post is null", report.post, null);
  // ── Step 8: Owner approves the report ─────────────────────────────────────
  const approvedReport =
    await api.functional.community.member.communities.reports.approve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // ── Step 9: Validate approved report ──────────────────────────────────────
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolver is non-null",
    approvedReport.resolver !== null,
  );
  TestValidator.equals(
    "comment field is non-null in approved report",
    approvedReport.comment !== null,
    true,
  );
  TestValidator.equals(
    "post field is null in approved report",
    approvedReport.post,
    null,
  );
  TestValidator.equals(
    "reporter username matches author",
    approvedReport.reporter.username,
    authorMember.username,
  );
  TestValidator.predicate(
    "updated_at is refreshed or equal to created_at",
    approvedReport.updated_at >= approvedReport.created_at,
  );
}
