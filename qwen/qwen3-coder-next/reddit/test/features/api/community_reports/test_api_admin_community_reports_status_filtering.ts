import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_admin_community_reports_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community via admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  const community = await api.functional.redditLike.member.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Create two members
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Member1 creates a post
  const post = await api.functional.redditLike.member.posts.create(
    member1Connection,
    {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member2 reports the post twice
  const report1 = await api.functional.redditLike.member.posts.reports.create(
    member2Connection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await api.functional.redditLike.member.posts.reports.create(
    member2Connection,
    {
      postId: post.id,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report2);
  // 5. Admin updates one report to 'approved'
  const updatedReport = await api.functional.redditLike.admin.reports.update(
    adminConnection,
    {
      reportId: report1.id,
      body: {
        status: "approved",
      } satisfies IRedditLikeReport.IUpdate,
    },
  );
  typia.assert(updatedReport);
  TestValidator.equals("status changed", updatedReport.status, "approved");
  // 6. Test status filtering
  // Test pending filter
  const pendingReports =
    await api.functional.redditLike.admin.communities.reports.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending count", pendingReports.data.length, 1);
  TestValidator.equals(
    "pending report matches",
    pendingReports.data[0].id,
    report2.id,
  );
  // Test approved filter
  const approvedReports =
    await api.functional.redditLike.admin.communities.reports.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          status: "approved",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals("approved count", approvedReports.data.length, 1);
  TestValidator.equals(
    "approved report matches",
    approvedReports.data[0].id,
    report1.id,
  );
  // Test dismissed filter (should be empty)
  const dismissedReports =
    await api.functional.redditLike.admin.communities.reports.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          status: "dismissed",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals("dismissed count", dismissedReports.data.length, 0);
  // Test no filter (all reports)
  const allReports =
    await api.functional.redditLike.admin.communities.reports.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          status: null,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals("all count", allReports.data.length, 2);
}
