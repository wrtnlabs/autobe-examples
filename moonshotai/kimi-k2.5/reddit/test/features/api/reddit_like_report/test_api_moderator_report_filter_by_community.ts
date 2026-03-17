import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_filter_by_community(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  // Create moderator connection and get moderator member info
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {});
  // Create reporting member connection
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  // Owner creates two communities
  const community1 =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {},
    );
  const community2 =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {},
    );
  // Owner assigns moderator to both communities
  await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
    body: {
      communityId: community1.id,
      memberId: moderatorAuth.member.id,
    },
  });
  await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
    body: {
      communityId: community2.id,
      memberId: moderatorAuth.member.id,
    },
  });
  // Reporting member subscribes to both communities
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community1.id,
    },
  );
  await api.functional.redditLike.member.communities.subscriptions.create(
    reporterConnection,
    {
      communityId: community2.id,
    },
  );
  // Reporting member creates posts in each community
  const post1 = await generate_random_reddit_like_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: community1.id,
        title: RandomGenerator.name(),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  const post2 = await generate_random_reddit_like_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: community2.id,
        title: RandomGenerator.name(),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // Reporting member submits reports for posts in both communities
  const report1 = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community1.id,
        postId: post1.id,
        commentId: null,
        reason: "Inappropriate content in community 1",
      },
    },
  );
  const report2 = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: community2.id,
        postId: post2.id,
        commentId: null,
        reason: "Inappropriate content in community 2",
      },
    },
  );
  // Moderator filters reports by community 1
  const result1 = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        communityId: community1.id,
        status: "pending",
        createdAtFrom: null,
        createdAtTo: null,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(result1);
  // Verify only community 1 reports are returned
  TestValidator.equals(
    "all filtered reports are from community 1",
    result1.data.every((r) => r.community.id === community1.id),
    true,
  );
  TestValidator.equals(
    "report 1 is included in community 1 results",
    result1.data.some((r) => r.id === report1.id),
    true,
  );
  TestValidator.equals(
    "report 2 is not included in community 1 results",
    result1.data.some((r) => r.id === report2.id),
    false,
  );
  // Moderator filters reports by community 2
  const result2 = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        communityId: community2.id,
        status: "pending",
        createdAtFrom: null,
        createdAtTo: null,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(result2);
  // Verify only community 2 reports are returned
  TestValidator.equals(
    "all filtered reports are from community 2",
    result2.data.every((r) => r.community.id === community2.id),
    true,
  );
  TestValidator.equals(
    "report 2 is included in community 2 results",
    result2.data.some((r) => r.id === report2.id),
    true,
  );
  TestValidator.equals(
    "report 1 is not included in community 2 results",
    result2.data.some((r) => r.id === report1.id),
    false,
  );
}
