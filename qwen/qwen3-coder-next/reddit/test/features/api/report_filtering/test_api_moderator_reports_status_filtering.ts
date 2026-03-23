import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_admin_communities_moderator_roles_create } from "../../../generate/generate_random_reddit_like_admin_communities_moderator_roles_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_reports_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user to create community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // 3. Create member user to create posts and submit reports
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 4. Admin creates a community
  const community = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 5. Assign moderator role to moderator user
  const moderatorRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          user_id: RandomGenerator.alphaNumeric(36),
          role: "moderator" as const,
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 6. Member creates a post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Submit multiple pending reports
  const report1 = await api.functional.redditLike.member.posts.reports.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await api.functional.redditLike.member.posts.reports.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report2);
  // 8. Test status filtering - pending reports
  const pendingReports =
    await api.functional.redditLike.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending" as const,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 2);
  // 9. Verify all returned reports are pending
  pendingReports.data.forEach((report) => {
    TestValidator.equals("report status", report.status, "pending");
  });
  // 10. Test status filtering - approved reports (should be empty initially)
  const approvedReports =
    await api.functional.redditLike.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "approved" as const,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved reports count",
    approvedReports.data.length,
    0,
  );
  // 11. Test status filtering - dismissed reports (should be empty initially)
  const dismissedReports =
    await api.functional.redditLike.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "dismissed" as const,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed reports count",
    dismissedReports.data.length,
    0,
  );
}
