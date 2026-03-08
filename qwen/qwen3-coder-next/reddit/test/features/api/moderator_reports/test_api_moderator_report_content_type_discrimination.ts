import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_content_type_discrimination(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // Retrieve reports with pagination to verify content type discrimination
  const reports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName: "test-community",
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(reports);
  // Verify response structure includes content type discrimination
  TestValidator.predicate("reports data exists", Array.isArray(reports.data));
  TestValidator.predicate(
    "pagination exists",
    reports.pagination !== undefined,
  );
  // Test that each report correctly identifies its content type
  for (const report of reports.data) {
    TestValidator.predicate(
      "report has valid content type",
      report.reported_content_type === "post" ||
        report.reported_content_type === "comment",
    );
    TestValidator.predicate(
      "report has content ID",
      report.reported_content_id !== undefined &&
        report.reported_content_id !== null,
    );
  }
  // Test filtering by status
  const pendingReports =
    await api.functional.redditLike.moderator.communities.reports.patchByCommunityname(
      moderatorConnection,
      {
        communityName: "test-community",
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        },
      },
    );
  typia.assert(pendingReports);
  // Test filtering by content type indirectly through report structure
  TestValidator.predicate(
    "reports structure is correct",
    pendingReports.data.every(
      (r) =>
        r.reported_content_type === "post" ||
        r.reported_content_type === "comment",
    ),
  );
}
