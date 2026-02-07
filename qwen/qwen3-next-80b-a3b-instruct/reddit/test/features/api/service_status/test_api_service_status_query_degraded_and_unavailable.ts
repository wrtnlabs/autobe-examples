import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityServiceStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_service_status_query_degraded_and_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin to access monitoring endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Query services with status degraded or unavailable
  // Despite IRequest being defined as {}, the endpoint requires filtering parameters.
  // Based on the API documentation, we must pass a filter object in the body.
  // Since ICommunityServiceStatus.IRequest is empty but the endpoint expects filters,
  // we create a filter object matching the API's actual behavior.
  // The scenario specifically requires filtering by status=degraded and status=unavailable.
  const queryBody = {
    status: ["degraded", "unavailable"],
  };
  const result = await api.functional.community.admin.service_statuses.index(
    adminConnection,
    {
      body: queryBody,
    },
  );
  typia.assert(result);
  // Validate pagination structure and data
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records at least 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages at least 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate("data array exists", result.data.length >= 0);
  // Create a temporary interface to describe the expected structure of service status entries
  interface IServiceStatus {
    id?: string;
    status: string;
  }
  // Validate that returned data contains only degraded or unavailable status
  for (const status of result.data) {
    // Use typia.assert to safely assert the correct structure with required properties
    const typedStatus: IServiceStatus = typia.assert<IServiceStatus>(status);
    // Validate that status property is a string and one of the expected values
    TestValidator.predicate(
      `status is a string for service ${typedStatus.id || "unknown"}`,
      typeof typedStatus.status === "string",
    );
    const validStatuses = ["degraded", "unavailable"] as const;
    TestValidator.predicate(
      `status is either degraded or unavailable for service ${typedStatus.id || "unknown"}`,
      validStatuses.includes(typedStatus.status as any),
    );
  }
}
