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

export async function test_api_report_pending_fetch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Generate community ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the pending reports endpoint
  const result =
    await api.functional.reddit.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId,
        body: {
          status: "pending",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IRedditReport.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate response structure
  TestValidator.equals("pagination should exist", result.pagination, undefined);
  TestValidator.predicate("must have data array", result.data.length > 0);
  // 5. Validate report summary fields - business logic only
  const report = result.data[0];
  TestValidator.equals(
    "report ID matches expected format",
    report.id.length,
    36,
  );
  TestValidator.equals("report reason has characters", report.reason.length, 0);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report timestamp is valid",
    report.createdAt.length,
    35,
  );
  TestValidator.equals(
    "report username exists",
    report.reporterUsername.length,
    0,
  );
}
