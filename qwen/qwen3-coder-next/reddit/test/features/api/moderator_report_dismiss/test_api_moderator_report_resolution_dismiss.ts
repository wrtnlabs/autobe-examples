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

export async function test_api_moderator_report_resolution_dismiss(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
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
  // 2. Member setup and create report
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  // Create a report using the available utility
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        reason: "Content appears inappropriate but is actually valid",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 3. Verify report appears in moderator's pending list
  const initialReports =
    await api.functional.redditLike.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(initialReports);
  TestValidator.predicate("report found in pending list", () =>
    initialReports.data.some((r) => r.id === report.id),
  );
  // 4. Dismiss the report as moderator
  const dismissedReport =
    await api.functional.redditLike.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(dismissedReport);
  // 5. Verify report status changed to 'dismissed'
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "timestamp updated on dismissal",
    () => dismissedReport.updated_at !== report.created_at,
  );
  // 6. Verify dismissed reports removed from active reports list
  const finalReports = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(finalReports);
  TestValidator.predicate(
    "report removed from pending list",
    () => !finalReports.data.some((r) => r.id === report.id),
  );
}
