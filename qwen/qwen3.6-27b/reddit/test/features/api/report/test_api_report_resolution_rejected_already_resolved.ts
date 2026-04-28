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
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Validates report resolution is rejected when the report has already been resolved by a moderator.
 *
 * Tests the business rule that prevents conflicting resolution actions on a report that is no longer in pending status. When a moderator resolves a report (by approving or dismissing it), the report lifecycle completes and any subsequent resolution attempt must be rejected.
 *
 * 1. Moderator member joins and creates a community, becoming its owner.
 * 2. Reporter member joins and subscribes to the community.
 * 3. Reporter creates a post within the community and submits a report targeting it.
 * 4. Moderator resolves the report by approving it (pending → approved).
 * 5. Moderator attempts to resolve the same already-resolved report again → request rejected.
 */
export async function test_api_report_resolution_rejected_already_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and creates community (becomes owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
    },
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      { body: { name: `Community-${RandomGenerator.alphabets(4)}` } },
    );
  typia.assert(community);
  // 2. Reporter joins and subscribes to the community
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
    },
  });
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      reporterConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 3. Reporter creates a post and submits a report on it
  const post = await generate_random_reddit_like_community_member_posts_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 4. Moderator resolves the report first (pending → approved)
  const resolvedReport =
    await api.functional.redditLikeCommunity.member.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);
  TestValidator.equals(
    "report status transitioned to approved",
    resolvedReport.status,
    "approved",
  );
  // 5. Moderator attempts to resolve the same report again → must be rejected
  await TestValidator.error(
    "resolving already approved report must be rejected",
    async () => {
      await api.functional.redditLikeCommunity.member.reports.update(
        moderatorConnection,
        {
          reportId: report.id,
          body: {
            status: "dismissed",
          } satisfies IREdditLikeCommunityReport.IUpdate,
        },
      );
    },
  );
}
