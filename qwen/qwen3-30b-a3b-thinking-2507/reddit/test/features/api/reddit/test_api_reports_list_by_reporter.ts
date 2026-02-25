import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReport";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_reports_list_by_reporter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const username = RandomGenerator.name();
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username,
    } satisfies IRedditMember.IJoin,
  });
  const reporterId = "reporter-" + RandomGenerator.alphaNumeric(12);
  const page: IPageIRedditReport.ISummary =
    await api.functional.reddit.member.reports.index(memberConnection, {
      body: {
        reporterId,
      } satisfies IRedditReport.IRequest,
    });
  typia.assert(page);
  TestValidator.equals("response has pagination", "pagination" in page, true);
  TestValidator.equals("response has data", "data" in page, true);
  for (const report of page.data) {
    TestValidator.equals(
      "reporter username matches",
      report.reporterUsername,
      username,
    );
    TestValidator.equals("report reason type", typeof report.reason, "string");
    TestValidator.equals("report status", report.status, "pending");
    TestValidator.equals(
      "report createdAt format",
      typeof report.createdAt,
      "string",
    );
  }
}
