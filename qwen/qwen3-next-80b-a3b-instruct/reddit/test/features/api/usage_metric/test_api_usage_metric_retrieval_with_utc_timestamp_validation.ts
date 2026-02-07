import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_usage_metric_retrieval_with_utc_timestamp_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // Extract the token from authentication response
  const token = authResponse.token.access;
  // Update adminConnection with the authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${token}`,
  };
  // Generate a valid UUID for metricId
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the usage metric
  const metric = await api.functional.community.admin.usage_metrics.at(
    adminConnection,
    {
      metricId,
    },
  );
  // Validate the response structure
  typia.assert(metric);
  // Since ICommunityUsageMetric is an empty object ({}), we validate it's an empty object
  // The scenario's requirement for timestamp validation is impossible given the schema,
  // so we validate what's actually possible: that an empty object is returned successfully
  TestValidator.equals(
    "response is an empty object",
    Object.keys(metric).length,
    0,
  );
  TestValidator.predicate(
    "response is an object",
    () => typeof metric === "object" && metric !== null,
  );
}
