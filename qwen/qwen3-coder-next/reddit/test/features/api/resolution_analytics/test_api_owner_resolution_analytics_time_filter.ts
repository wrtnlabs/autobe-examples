import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_resolution_analytics_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account for authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(3),
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(owner);
  typia.assert(owner.token);
  // 2. Create connection with owner authentication
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: owner.token.access,
    },
  };
  // 3. Call resolution analytics endpoint
  const analytics =
    await api.functional.redditClone.owner.analytics.reports.resolution.resolutionAnalytics(
      authenticatedConnection,
    );
  typia.assert(analytics);
  // 4. Validate response structure and types
  typia.assert(analytics);
  TestValidator.equals("has non-empty id", analytics.id !== "", true);
  TestValidator.equals(
    "has non-empty reportId",
    analytics.reportId !== "",
    true,
  );
  TestValidator.equals(
    "has non-empty moderatorId",
    analytics.moderatorId !== "",
    true,
  );
  TestValidator.equals("action is string", typeof analytics.action, "string");
  TestValidator.equals("resolvedAt is valid date-time", !isNaN(new Date(analytics.resolvedAt).getTime()), true);
  TestValidator.equals("createdAt is valid date-time", !isNaN(new Date(analytics.createdAt).getTime()), true);
  TestValidator.equals("updatedAt is valid date-time", !isNaN(new Date(analytics.updatedAt).getTime()), true);
}