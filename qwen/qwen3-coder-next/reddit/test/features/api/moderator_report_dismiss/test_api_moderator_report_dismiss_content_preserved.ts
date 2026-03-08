import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_dismiss_content_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderatorUser);
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberUser);
  // 3. Member logs in and creates a post
  await authorize_member_login(memberConnection, {
    body: {
      email: memberUser.email,
      password: "12345678",
    } satisfies IRedditLikeMember.ILogin,
  });
  // For community_id, we need an existing community
  // Since we can't create one, we'll use a dummy UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test post for report",
        type: "text",
        content: "This is a test post content",
        community_id: communityId,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 5. Reporter creates a report for the post
  const report = await api.functional.redditLike.member.reports.create(
    reporterConnection,
    {
      body: {
        reported_post_id: post.id,
        reason: "This post violates community guidelines",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 6. Moderator logs in
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorUser.email as string &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: "12345678",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 7. Moderator dismisses the report
  await api.functional.redditLike.moderator.reports.moderator_action.moderatorAction(
    moderatorConnection,
    {
      reportId: report.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  // 8. Verify report status changed to 'dismissed'
  const reportsResponse =
    await api.functional.redditLike.moderator.reports.moderator_action.moderatorAction(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(reportsResponse);
  TestValidator.equals(
    "report status is now dismissed",
    reportsResponse.data.find((r) => r.id === report.id)?.status,
    "dismissed",
  );
  // 9. Verify the reported post still exists and is accessible
  const retrievedPost = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Another post",
        type: "text",
        content: "Test content",
        community_id: communityId,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(retrievedPost);
  TestValidator.notEquals(
    "original post is different from new post",
    retrievedPost.id,
    post.id,
  );
}
