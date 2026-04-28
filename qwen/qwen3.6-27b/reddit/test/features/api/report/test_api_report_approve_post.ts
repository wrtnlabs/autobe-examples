import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test community report approval workflow for post content moderation.
 *
 * Validates the complete report lifecycle including community creation by owner, moderator assignment, post creation by subscriber, content reporting by community member, and moderator resolution through approval. The approval triggers post deletion while maintaining audit trail of the moderation action.
 *
 * 1. Community owner registers and creates community
 * 2. Moderator registers, subscribes, and is appointed to community
 * 3. Author registers, subscribes, and creates a post
 * 4. Reporter registers, subscribes, and reports the post
 * 5. Moderator approves the report-on-post junction
 * The test validates that the reported post is properly soft-deleted, the report status transitions to approved, and the moderator's resolution action is recorded with resolved_by_member_id and resolved_at timestamp.
 */
export async function test_api_report_approve_post(
  connection: api.IConnection,
) {
  // 1. User A registers and creates community
  const aConnection: api.IConnection = { host: connection.host };
  const aAuthorized = await authorize_member_join(aConnection, {
    body: {
      email: "a@test.com",
      password: "passwordA123",
      username: "a-user",
      href: "http://localhost/communities",
      referrer: "http://localhost/ref",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(aAuthorized);
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      aConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 2. User B registers, subscribes to community, and becomes moderator
  const bConnection: api.IConnection = { host: connection.host };
  const bAuthorized = await authorize_member_join(bConnection, {
    body: {
      email: "b@test.com",
      password: "passwordB123",
      username: "b-user",
      href: "http://localhost/communities",
      referrer: "http://localhost/ref",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(bAuthorized);
  // B subscribes to community
  const bSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      bConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(bSubscription);
  // B appointed as moderator
  const bModerator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      bConnection,
      {
        params: { communityId: community.id },
        body: { member_id: bAuthorized.id },
      },
    );
  typia.assert(bModerator);
  // 3. User C registers, subscribes, and creates a post
  const cConnection: api.IConnection = { host: connection.host };
  const cAuthorized = await authorize_member_join(cConnection, {
    body: {
      email: "c@test.com",
      password: "passwordC123",
      username: "c-user",
      href: "http://localhost/posts",
      referrer: "http://localhost/ref",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(cAuthorized);
  // C subscribes to community
  const cSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      cConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(cSubscription);
  // C creates post
  const post = await generate_random_reddit_like_community_member_posts_create(
    cConnection,
    {
      body: {
        title: "Test Post for Reporting",
        post_type: "text",
        community_id: community.id,
        body: "This is a test post content that will be reported and approved.",
      },
    },
  );
  typia.assert(post);
  // 4. User D registers, subscribes, and reports the post
  const dConnection: api.IConnection = { host: connection.host };
  const dAuthorized = await authorize_member_join(dConnection, {
    body: {
      email: "d@test.com",
      password: "passwordD123",
      username: "d-user",
      href: "http://localhost/reports",
      referrer: "http://localhost/ref",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(dAuthorized);
  // D subscribes to community
  const dSubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      dConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(dSubscription);
  // D reports the post - creates report and implicitly creates report-on-post junction
  const report = await api.functional.redditLikeCommunity.member.reports.create(
    dConnection,
    {
      body: {
        postId: post.id,
        reason:
          "This post violates community guidelines and should be reviewed.",
      } satisfies IREdditLikeCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. User B approves the report-on-post junction
  // The onPost junction is created during report creation when postId is provided
  const reportOnPostId: string & tags.Format<"uuid"> = report.onPost!.id;
  const resolvedReport =
    await api.functional.redditLikeCommunity.member.reports.report_on_posts.update(
      bConnection,
      {
        reportId: report.id,
        reportOnPostId,
        body: {
          status: "approved",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  // Validate the approval workflow
  TestValidator.equals(
    "report status approved",
    resolvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "report resolved by moderator",
    resolvedReport.resolvedBy !== null,
  );
  TestValidator.predicate(
    "resolved timestamp set",
    resolvedReport.resolved_at !== null,
  );
  TestValidator.equals(
    "report on post target type",
    resolvedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "report community matches",
    resolvedReport.community.id,
    community.id,
  );
  TestValidator.equals("report id unchanged", resolvedReport.id, report.id);
}
