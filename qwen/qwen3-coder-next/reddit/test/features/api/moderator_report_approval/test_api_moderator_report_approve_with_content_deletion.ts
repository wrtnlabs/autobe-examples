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

export async function test_api_moderator_report_approve_with_content_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: null,
        href: "https://example.com",
        referrer: "https://referrer.com",
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Create regular member
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.redditLike.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  await api.functional.redditLike.auth.member.join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // Create a test post - assuming a community exists or using a default one
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test Post for Report",
        type: "text" as const,
        content:
          "This is a test post that should be deleted after report approval",
        community_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create report for the post
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
  // 5. Moderator approves the report with content deletion
  await api.functional.redditLike.moderator.reports.moderator_action.moderatorAction(
    moderatorConnection,
    {
      reportId: report.id,
      body: {
        search: "community guidelines violation",
        status: "pending",
        reporter_id: undefined,
        reported_post_id: post.id,
        reported_comment_id: undefined,
        created_at_min: undefined,
        created_at_max: undefined,
        sort: "created_at",
        page: 1,
        limit: 10,
      },
    },
  );
  // 6. Verify report status changed to 'approved'
  const updatedReport =
    await api.functional.redditLike.moderator.reports.moderator_action.moderatorAction(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          search: "",
          status: "approved",
          reporter_id: undefined,
          reported_post_id: post.id,
          reported_comment_id: undefined,
          created_at_min: undefined,
          created_at_max: undefined,
          sort: "created_at",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(updatedReport);
  TestValidator.equals(
    "report status is approved",
    updatedReport.data.length,
    1,
  );
  TestValidator.equals(
    "report is approved",
    updatedReport.data[0].status,
    "approved",
  );
}