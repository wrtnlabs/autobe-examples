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
import { generate_random_reddit_like_member_comments_reports_create } from "../../../generate/generate_random_reddit_like_member_comments_reports_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_reports_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test data
  // 1.1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "_admin",
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 1.2. Create first moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "_mod",
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  // 1.3. Create second moderator account
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_moderator_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "_mod2",
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  // 1.4. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "_member",
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 1.5. Create another member account to submit reports
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "_reporter",
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create community
  const community = await api.functional.redditLike.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      },
    },
  );
  typia.assert(community);
  // 3. Assign moderators to community
  const modRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          user_id: moderator.id,
          role: "moderator",
        },
      },
    );
  typia.assert(modRole);
  const modRole2 =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          user_id: moderator2.id,
          role: "moderator",
        },
      },
    );
  typia.assert(modRole2);
  // 4. Create test post by member
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create test comment by member
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(comment);
  // 6. Submit reports by reporter
  const postReport =
    await api.functional.redditLike.member.posts.reports.create(
      reporterConnection,
      {
        postId: post.id,
        body: {
          reason: "Inappropriate content detected",
        },
      },
    );
  typia.assert(postReport);
  const commentReport =
    await api.functional.redditLike.member.comments.reports.create(
      reporterConnection,
      {
        commentId: comment.id,
        body: {
          reason: "Spam content detected",
        },
      },
    );
  typia.assert(commentReport);
  // 7. Verify moderator can retrieve reports
  const reportsResponse =
    await api.functional.redditLike.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(reportsResponse);
  // 8. Validate report retrieval
  TestValidator.equals("two reports returned", reportsResponse.data.length, 2);
  const reportIds = reportsResponse.data.map((r) => r.id).sort();
  const expectedIds = [postReport.id, commentReport.id].sort();
  TestValidator.equals("report IDs match", reportIds, expectedIds);
  // 9. Test with filter parameters
  const pendingReports =
    await api.functional.redditLike.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 2);
}
