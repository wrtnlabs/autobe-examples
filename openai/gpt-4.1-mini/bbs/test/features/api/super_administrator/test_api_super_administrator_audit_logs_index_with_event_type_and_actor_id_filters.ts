import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_audit_logs_index_with_event_type_and_actor_id_filters(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  superAdminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Scenario 1: Retrieve all audit logs with default pagination settings.
  const resp1 =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(resp1);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is positive number",
    resp1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive number",
    resp1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is zero or more",
    resp1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is zero or more",
    resp1.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(resp1.data));
  // Scenario 2: Retrieve audit logs filtered by event type.
  // Cannot check each entry's event_type property because it does not exist in ISummary
  const testEventType = "user_login";
  const resp2 =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      { body: { eventType: testEventType } },
    );
  typia.assert(resp2);
  TestValidator.predicate("data is array", Array.isArray(resp2.data));
  // Scenario 3: Retrieve audit logs filtered by actor ID.
  // Cannot check each entry's actor_id property because it does not exist in ISummary
  if (resp1.data.length > 0) {
    // Since actorId filter requires a valid actor Id, but we cannot get from the data,
    // we just test with an undefined or null actorId which is logically not valid.
    // However, the original scenario request says to use a specific actorId from data, but
    // that is impossible due to no actorId property, so we bypass detailed check.
    // The test therefore cannot validate filter precision on actorId in the data.
    // Instead pass an empty string as actorId to confirm the API call succeeds and returns a data array.
    const resp3 =
      await api.functional.discussionBoard.superAdministrator.auditLogs.index(
        superAdminConnection,
        { body: { actorId: "00000000-0000-0000-0000-000000000000" } },
      );
    typia.assert(resp3);
    TestValidator.predicate("data is array", Array.isArray(resp3.data));
  }
}
