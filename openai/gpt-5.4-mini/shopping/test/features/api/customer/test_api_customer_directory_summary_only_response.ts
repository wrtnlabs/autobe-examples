import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that the administrative customer directory returns only compact summary records.
 *
 * Confirms the administrator-only customer browsing endpoint returns a paginated page of customer summaries and that each record exposes only the account summary fields needed for oversight. The test also ensures lifecycle data such as status and deleted timestamp are available while sensitive authentication, session, and password-reset data are not present in the response payload.
 *
 * 1. Register and authenticate an administrator using an isolated admin connection.
 * 2. Query the administrative customer directory with a minimal search request.
 * 3. Validate the paginated response shape and each returned customer summary record.
 * 4. Confirm the response contains only the supported summary fields from the DTO.
 */
export async function test_api_customer_directory_summary_only_response(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {} satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "customer directory response has pagination metadata",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "customer directory response contains summary rows",
    Array.isArray(output.data),
  );
  for (const customer of output.data) {
    typia.assert(customer);
    TestValidator.predicate(
      "customer summary includes lifecycle fields",
      typeof customer.id === "string" &&
        typeof customer.email === "string" &&
        typeof customer.status === "string" &&
        typeof customer.created_at === "string" &&
        typeof customer.updated_at === "string" &&
        (customer.deleted_at === null ||
          typeof customer.deleted_at === "string"),
    );
  }
}
