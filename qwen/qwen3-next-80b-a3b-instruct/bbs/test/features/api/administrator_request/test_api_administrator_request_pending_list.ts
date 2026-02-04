import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_pending_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<100>
    >(),
  } satisfies IEconomicDiscussionSuperAdministrator.IJoin;
  await authorize_super_administrator_join(superAdminConnection, {
    body: superAdminCreds,
  });
  // Step 2: Call the pending administrator requests endpoint as super administrator
  const pendingRequests: IPageIEconomicDiscussionAdministratorRequest =
    await api.functional.economicDiscussion.superAdministrator.administrator_requests.pending.index(
      superAdminConnection,
    );
  typia.assert(pendingRequests);
  // Step 3: Validate the response structure
  TestValidator.equals(
    "pagination exists",
    pendingRequests.pagination,
    pendingRequests.pagination,
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(pendingRequests.data),
  );
  TestValidator.predicate(
    "at least one request in data",
    () => pendingRequests.data.length >= 0,
  );
  // Validate that each pending request has the required structure
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "requester_id is UUID",
      typeof request.requester_id,
      "string",
    );
    TestValidator.predicate("requester_id is valid UUID", () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(request.requester_id);
    });
    TestValidator.equals("reason is string", typeof request.reason, "string");
    TestValidator.predicate(
      "reason length is within range",
      () => request.reason.length >= 10 && request.reason.length <= 1000,
    );
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals(
      "submitted_at is ISO date time",
      typeof request.submitted_at,
      "string",
    );
    TestValidator.predicate("submitted_at is valid date-time format", () => {
      const dateTimeRegex =
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i;
      return dateTimeRegex.test(request.submitted_at);
    });
    // decision is optional, can be null or undefined
  }
  // Step 4: Verify that non-super-administrator attempts receive 403 Forbidden
  // For non-super-administrator cases, we create unauthenticated connections
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Use TestValidator.httpError to validate HTTP status code 403
  await TestValidator.httpError(
    "non-super-administrator receives 403 Forbidden",
    403,
    async () => {
      await api.functional.economicDiscussion.superAdministrator.administrator_requests.pending.index(
        unauthenticatedConnection,
      );
    },
  );
}
