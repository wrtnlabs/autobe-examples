import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
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
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
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
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

export async function test_api_report_pending_listing_as_moderator(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: "password123",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAuth: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: "password123",
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IREdditLikeCommunityMember.IJoin,
    });
  const moderator: IRedditLikeCommunityModerator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        } satisfies DeepPartial<IRedditLikeCommunityModerator.ICreate>,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator);
  const contentCreatorConnection: api.IConnection = { host: connection.host };
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorAuth: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(contentCreatorConnection, {
      body: {
        email: contentCreatorEmail,
        password: "password123",
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IREdditLikeCommunityMember.IJoin,
    });
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      contentCreatorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      contentCreatorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies Partial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assert(post);
  const comment: IRedditLikeCommunityPostComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      contentCreatorConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies Partial<IRedditLikeCommunityPostComment.ICreate>,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  const postReport: IREdditLikeCommunityReport =
    await generate_random_reddit_like_community_member_reports_create(
      contentCreatorConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies Partial<IREdditLikeCommunityReport.ICreate>,
      },
    );
  typia.assert(postReport);
  const commentReport: IREdditLikeCommunityReport =
    await generate_random_reddit_like_community_member_reports_create(
      contentCreatorConnection,
      {
        body: {
          commentId: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies Partial<IREdditLikeCommunityReport.ICreate>,
      },
    );
  typia.assert(commentReport);
  const reportsPage: IPageIRedditLikeCommunityReport.ISummary =
    await api.functional.redditLikeCommunity.member.reports.community.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        } satisfies IREdditLikeCommunityReport.IRequest,
      },
    );
  typia.assert(reportsPage);
  TestValidator.equals("pending reports count", reportsPage.data.length, 2);
  TestValidator.equals("total records", reportsPage.pagination.records, 2);
  TestValidator.equals("pagination limit", reportsPage.pagination.limit, 20);
  TestValidator.equals("current page", reportsPage.pagination.current, 1);
  reportsPage.data.forEach((report) => {
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.equals(
      "report community id matches",
      report.community.id,
      community.id,
    );
    TestValidator.equals(
      "report created by content creator",
      report.reportedBy.username,
      contentCreatorAuth.username,
    );
  });
  const targetTypes = reportsPage.data.map((r) => r.target_type);
  TestValidator.equals(
    "post target report exists",
    targetTypes.includes("post"),
    true,
  );
  TestValidator.equals(
    "comment target report exists",
    targetTypes.includes("comment"),
    true,
  );
  reportsPage.data.forEach((report) => {
    TestValidator.predicate("report has reason text", report.reason.length > 0);
  });
}
