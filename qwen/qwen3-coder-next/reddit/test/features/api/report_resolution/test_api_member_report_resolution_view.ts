import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_report_resolution_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create resolution with mock data (using random since no creation API provided)
  const resolution =
    api.functional.redditPlatform.member.redditPlatform.reportResolutions.at.random();
  typia.assert(resolution);
  // 3. View resolution as the member
  const viewedResolution =
    await api.functional.redditPlatform.member.redditPlatform.reportResolutions.at(
      memberConnection,
      {
        resolutionId: resolution.id,
      },
    );
  typia.assert(viewedResolution);
  // 4. Validate resolution data
  TestValidator.equals(
    "resolution ID matches",
    viewedResolution.id,
    resolution.id,
  );
  TestValidator.predicate(
    "has valid status",
    ["RESOLVED", "DISMISSED"].includes(viewedResolution.status),
  );
  TestValidator.predicate(
    "has valid timestamp",
    new Date(viewedResolution.resolved_at) <= new Date(),
  );
  TestValidator.predicate(
    "has valid created_at",
    new Date(viewedResolution.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "has valid updated_at",
    new Date(viewedResolution.updated_at) <= new Date(),
  );
  // 5. Validate relationships
  if (viewedResolution.admin) {
    TestValidator.predicate(
      "admin has valid id",
      /^[0-9a-f-]{36}$/i.test(viewedResolution.admin.id),
    );
    TestValidator.predicate(
      "admin has valid username",
      typeof viewedResolution.admin.username === "string",
    );
  }
  if (viewedResolution.report) {
    TestValidator.predicate(
      "report has valid id",
      /^[0-9a-f-]{36}$/i.test(viewedResolution.report.id),
    );
    TestValidator.predicate(
      "report has valid type",
      ["POST", "COMMENT"].includes(viewedResolution.report.reported_type),
    );
    TestValidator.equals(
      "report has valid status",
      viewedResolution.report.status,
      "PENDING",
    );
  }
}
