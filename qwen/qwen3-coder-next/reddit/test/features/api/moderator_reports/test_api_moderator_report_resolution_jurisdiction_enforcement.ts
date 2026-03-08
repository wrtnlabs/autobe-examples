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
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_resolution_jurisdiction_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two moderators using proper join flow
  const moderatorAConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const moderatorBConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Login both moderators
  const moderatorA = await authorize_moderator_login(moderatorAConnection, {
    body: {
      email: typia.random<
        string & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "1234",
    },
  });
  typia.assert(moderatorA);
  const moderatorB = await authorize_moderator_login(moderatorBConnection, {
    body: {
      email: typia.random<
        string & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "1234",
    },
  });
  typia.assert(moderatorB);
  // 3. Create member to post content
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  const member = await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(member);
  // 4. Create report for inappropriate content
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        reported_post_id: "00000000-0000-0000-0000-000000000001",
        reason: "Violates community guidelines",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report status is initially pending",
    report.status,
    "pending",
  );
  // 5. Moderator B attempts to resolve report for community A content
  // This should fail because moderator B doesn't have jurisdiction over community A
  await TestValidator.error(
    "moderator B cannot resolve report for community A",
    async () => {
      await api.functional.redditLike.moderator.reports.update(
        moderatorBConnection,
        {
          reportId: report.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    },
  );
  // 6. Verify report status remains 'pending' after unauthorized attempt
  const reportsAfterUnauthorized =
    await api.functional.redditLike.moderator.reports.index(
      moderatorAConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reportsAfterUnauthorized);
  const foundReport = reportsAfterUnauthorized.data.find(
    (r) => r.id === report.id,
  );
  TestValidator.notEquals(
    "report still exists in pending",
    foundReport?.status,
    "approved",
  );
  TestValidator.equals(
    "report status unchanged after unauthorized attempt",
    foundReport?.status,
    "pending",
  );
}
