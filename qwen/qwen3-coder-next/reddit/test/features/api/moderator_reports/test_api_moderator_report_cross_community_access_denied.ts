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

export async function test_api_moderator_report_cross_community_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator A for community A
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create moderator B for community B
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
    },
  });
  // Login as member
  await authorize_member_login(memberConnection, {
    body: {
      email: member.email,
      password: "password",
    } satisfies IRedditLikeMember.ILogin,
  });
  // Create report for the post
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        reason: "Inappropriate content",
      },
    },
  );
  typia.assert(report);
  // Login as moderator B to test access
  await authorize_moderator_login(moderatorBConnection, {
    body: {
      email: typia.random<
        string & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "password",
    } satisfies IRedditLikeModerator.ILogin,
  });
  // Moderator B attempts to approve the report (should fail with 403 Forbidden)
  await TestValidator.error(
    "moderator cross-community access denied",
    async () => {
      await api.functional.redditLike.moderator.reports.moderator_action.moderatorAction(
        moderatorBConnection,
        {
          reportId: report.id,
          body: {
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
  // Verify report status remains pending
  const reportAfter =
    await api.functional.redditLike.moderator.reports.moderator_action.moderatorAction(
      moderatorBConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(reportAfter);
  TestValidator.equals(
    "report status remains pending",
    reportAfter.data[0]?.status,
    "pending",
  );
}
