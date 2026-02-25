import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection to assign moderator role
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 3. Create reporter user connection
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 4. Get moderator's assigned communities
  const communities = await api.functional.redditClone.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(communities);
  // 5. Test report listing with various filters
  const reportData = {
    status: "pending" as const,
    content_type: "post" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditCloneModerationReport.IRequest;
  // 6. Get pending reports
  const pendingReports =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      {
        body: reportData,
      },
    );
  typia.assert(pendingReports);
  // 7. Validate response structure
  TestValidator.equals("has pagination", pendingReports.pagination.current, 1);
  TestValidator.predicate("has reports", pendingReports.data.length >= 0);
  // 8. Test with different filters
  const approvedReports =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          ...reportData,
          status: "approved" as const,
        },
      },
    );
  typia.assert(approvedReports);
  // 9. Test with search
  const searchedReports =
    await api.functional.redditClone.moderator.reports.index(
      moderatorConnection,
      {
        body: {
          ...reportData,
          search: "test",
        },
      },
    );
  typia.assert(searchedReports);
  // 10. Test pagination
  const page2Reports = await api.functional.redditClone.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        ...reportData,
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(page2Reports);
}
