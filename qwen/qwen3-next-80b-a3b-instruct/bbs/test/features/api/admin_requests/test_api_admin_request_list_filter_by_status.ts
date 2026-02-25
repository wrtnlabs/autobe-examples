import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdministrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Filter admin requests by status = 'pending'
  const filteredRequests =
    await api.functional.economicBoard.superAdministrator.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(filteredRequests);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredRequests.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records positive",
    filteredRequests.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    filteredRequests.pagination.pages >= 0,
  );
  // Validate that exactly 10 requests were returned
  TestValidator.equals(
    "exactly 10 requests returned",
    filteredRequests.data.length,
    10,
  );
  // Validate that all returned requests have action_type as 'approve_admin_request' for pending requests
  TestValidator.predicate(
    "all requests have approve_admin_request action_type",
    filteredRequests.data.every(
      (request) => request.action_type === "approve_admin_request",
    ),
  );
  // Validate that each request has required properties
  filteredRequests.data.forEach((request) => {
    // ID must be a valid UUID
    TestValidator.predicate(
      "request id is uuid",
      /^[0-9a-f-]{36}$/i.test(request.id),
    );
    // Action type must be approve_admin_request for pending filter
    TestValidator.equals(
      "request action_type is approve_admin_request",
      request.action_type,
      "approve_admin_request",
    );
    // Created at must be a valid date-time
    TestValidator.predicate(
      "request created_at is valid date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        request.created_at,
      ),
    );
    // Actor information
    TestValidator.equals(
      "actor id is string",
      typeof request.actor.id,
      "string",
    );
    TestValidator.predicate(
      "actor id is uuid",
      /^[0-9a-f-]{36}$/i.test(request.actor.id),
    );
    TestValidator.equals(
      "actor email is string",
      typeof request.actor.email,
      "string",
    );
    TestValidator.predicate(
      "actor email is valid",
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
        request.actor.email,
      ),
    );
    TestValidator.equals(
      "actor created_at is string",
      typeof request.actor.created_at,
      "string",
    );
    TestValidator.predicate(
      "actor created_at is valid date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        request.actor.created_at,
      ),
    );
    TestValidator.equals(
      "actor is_banned is boolean",
      typeof request.actor.is_banned,
      "boolean",
    );
    // Target (the person requesting promotion)
    if (request.target !== null && request.target !== undefined) {
      TestValidator.equals(
        "target id is string",
        typeof request.target.id,
        "string",
      );
      TestValidator.predicate(
        "target id is uuid",
        /^[0-9a-f-]{36}$/i.test(request.target.id),
      );
      TestValidator.equals(
        "target email is string",
        typeof request.target.email,
        "string",
      );
      TestValidator.predicate(
        "target email is valid",
        /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
          request.target.email,
        ),
      );
      TestValidator.equals(
        "target created_at is string",
        typeof request.target.created_at,
        "string",
      );
      TestValidator.predicate(
        "target created_at is valid date-time",
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
          request.target.created_at,
        ),
      );
      // Target display_name can be null, so we validate type but not content
      TestValidator.equals(
        "target display_name is string or null",
        request.target.display_name === null ||
          typeof request.target.display_name === "string",
        true,
      );
    }
  });
}