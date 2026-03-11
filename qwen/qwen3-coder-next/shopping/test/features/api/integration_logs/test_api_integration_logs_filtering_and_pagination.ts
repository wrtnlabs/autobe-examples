import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallIntegrationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_integration_logs_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test pagination and filtering with various combinations
  const response =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      adminConnection,
      {
        body: {
          integration_type: "payment_gateway",
          status: "success",
          page: 1,
          limit: 10,
          error_message: null,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  // 3. Validate response structure
  typia.assert(response);
  TestValidator.predicate(
    "has pagination",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate("has data", Array.isArray(response.data));
  // 4. Validate pagination metadata
  TestValidator.predicate("page >= 1", response.pagination.current >= 1);
  TestValidator.predicate("limit >= 1", response.pagination.limit >= 1);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // 5. Validate log entries
  for (const log of response.data) {
    typia.assert(log);
    TestValidator.predicate("has valid id", typeof log.id === "string");
    TestValidator.predicate(
      "has valid integration_type",
      typeof log.integration_type === "string",
    );
    TestValidator.predicate(
      "has valid api_endpoint",
      typeof log.api_endpoint === "string",
    );
    TestValidator.predicate(
      "has valid request_method",
      typeof log.request_method === "string",
    );
    TestValidator.predicate(
      "has valid response_status",
      typeof log.response_status === "number",
    );
    TestValidator.predicate(
      "has valid error_message",
      typeof log.error_message === "string" || log.error_message === null,
    );
    TestValidator.predicate(
      "has valid duration_ms",
      typeof log.duration_ms === "number",
    );
    TestValidator.predicate(
      "has valid created_at",
      typeof log.created_at === "string",
    );
  }
  // 6. Test different filter combinations
  const filteredResponse =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      adminConnection,
      {
        body: {
          integration_type: "shipping_carrier",
          status: "failure",
          duration_ms_min: 100,
          duration_ms_max: 5000,
          page: 1,
          limit: 20,
          error_message: null,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Test error message filtering
  const errorFilteredResponse =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      adminConnection,
      {
        body: {
          error_message: "timeout",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(errorFilteredResponse);
  // 8. Test pagination with different page/limit combinations
  const paginationResponse =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
          error_message: null,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "page count matches",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals("limit matches", paginationResponse.pagination.limit, 5);
}