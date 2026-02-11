import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_analytics_reports_status_summary(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies ICommunityAdmin.IJoin,
  });
  // Call API to get analytics
  const analytics =
    await api.functional.community.admin.analytics.reports.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Verify response structure
  TestValidator.predicate(
    "analytics contains valid count for pending",
    analytics.pending >= 0,
  );
  TestValidator.predicate(
    "analytics contains valid count for approved",
    analytics.approved >= 0,
  );
  TestValidator.predicate(
    "analytics contains valid count for dismissed",
    analytics.dismissed >= 0,
  );
}
