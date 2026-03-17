import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReportSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_snapshot_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member (content creator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(memberAuth);
  // Step 2: Create community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        },
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        title: typia.random<string>(),
        community_id: community.id,
        post_type: "text",
        body: typia.random<string>(),
      },
    });
  typia.assert(post);
  // Step 5: Create report targeting the post (snapshot 1: pending)
  const report: IRedditLikeReport =
    await generate_random_reddit_like_member_reports_create(memberConnection, {
      body: {
        communityId: community.id,
        reason: "Test report for moderation review",
        postId: post.id,
        commentId: null,
      },
    });
  typia.assert(report);
  // Step 6: Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // Test Execution - Sorting (desc - default)
  const descSnapshots: IPageIRedditLikeReportSnapshot.ISummary =
    await api.functional.redditLike.moderator.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          sortDirection: "desc",
        } satisfies IRedditLikeReportSnapshot.IRequest,
      },
    );
  typia.assert(descSnapshots);
  // Validate descending order - newest first
  if (descSnapshots.data.length > 1) {
    for (let i = 0; i < descSnapshots.data.length - 1; i++) {
      const current = descSnapshots.data[i]!;
      const next = descSnapshots.data[i + 1]!;
      TestValidator.predicate(
        "descending order - current timestamp >= next timestamp",
        new Date(current.createdAt) >= new Date(next.createdAt),
      );
    }
  }
  // Test Execution - Sorting (asc)
  const ascSnapshots: IPageIRedditLikeReportSnapshot.ISummary =
    await api.functional.redditLike.moderator.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          sortDirection: "asc",
        } satisfies IRedditLikeReportSnapshot.IRequest,
      },
    );
  typia.assert(ascSnapshots);
  // Validate ascending order - oldest first
  if (ascSnapshots.data.length > 1) {
    for (let i = 0; i < ascSnapshots.data.length - 1; i++) {
      const current = ascSnapshots.data[i]!;
      const next = ascSnapshots.data[i + 1]!;
      TestValidator.predicate(
        "ascending order - current timestamp <= next timestamp",
        new Date(current.createdAt) <= new Date(next.createdAt),
      );
    }
  }
  // Verify both responses have the same total count
  TestValidator.equals(
    "asc and desc queries return same total records",
    descSnapshots.pagination.records,
    ascSnapshots.pagination.records,
  );
  // Test Execution - Pagination
  const pagedSnapshots: IPageIRedditLikeReportSnapshot.ISummary =
    await api.functional.redditLike.moderator.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditLikeReportSnapshot.IRequest,
      },
    );
  typia.assert(pagedSnapshots);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pagedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pagedSnapshots.pagination.limit, 1);
  TestValidator.equals(
    "pagination records matches total",
    pagedSnapshots.pagination.records,
    descSnapshots.pagination.records,
  );
  TestValidator.equals(
    "pagination pages calculated",
    pagedSnapshots.pagination.pages,
    1,
  );
  TestValidator.equals(
    "data array has exactly 1 item",
    pagedSnapshots.data.length,
    1,
  );
}
