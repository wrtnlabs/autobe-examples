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

export async function test_api_moderator_report_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as moderator
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
  // 2. Retrieve first page with limit=20
  const firstPage = await api.functional.redditClone.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(firstPage);
  // 3. Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length <= 20",
    firstPage.data.length <= 20,
  );
  // 4. Validate report structure in first page
  if (firstPage.data.length > 0) {
    const firstReport = firstPage.data[0];
    TestValidator.equals("report has id", typeof firstReport.id, "string");
    TestValidator.equals(
      "report has reporter id type",
      typeof firstReport.reporter.id,
      "string",
    );
    TestValidator.equals(
      "report has content id type",
      typeof firstReport.content.id,
      "string",
    );
    TestValidator.predicate(
      "report has valid status",
      ["pending", "approved", "dismissed"].includes(firstReport.status),
    );
    TestValidator.predicate(
      "report has created_at",
      typeof firstReport.created_at === "string",
    );
    TestValidator.predicate(
      "report has resolved_at",
      firstReport.resolved_at === null ||
        typeof firstReport.resolved_at === "string",
    );
  }
  // 5. Retrieve second page with limit=20
  const secondPage = await api.functional.redditClone.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        page: 2,
        limit: 20,
      },
    },
  );
  typia.assert(secondPage);
  // 6. Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.predicate(
    "second page data length <= 20",
    secondPage.data.length <= 20,
  );
  // 7. Verify reports are sorted by created_at DESC (newest first)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].created_at).getTime();
    const next = new Date(firstPage.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "reports sorted by created_at DESC",
      current >= next,
    );
  }
}
