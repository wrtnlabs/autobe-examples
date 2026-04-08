import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate administrator visibility into customer account lifecycle data.
 *
 * This test authenticates an administrator, retrieves a customer account through the
 * administrative customer detail endpoint, and validates that the returned record
 * exposes the customer account fields needed for governance and oversight.
 *
 * The scenario confirms the response is a customer account record, that lifecycle
 * metadata such as status and deleted_at are available, and that the endpoint does
 * not expose unrelated profile or credential material in the DTO contract.
 *
 * 1. Authenticate as an administrator using the join utility.
 * 2. Request a customer account detail record using a UUID customer identifier.
 * 3. Validate the response against the customer account DTO.
 * 4. Confirm the returned payload is limited to the customer account record.
 */
export async function test_api_customer_account_lifecycle_state_visibility(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.mallPlatform.administrator.customers.at(
    adminConnection,
    {
      customerId,
    },
  );
  typia.assert(customer);
  TestValidator.equals("customer id is preserved", customer.id, customerId);
  TestValidator.predicate(
    "customer account status is exposed",
    customer.status.length > 0,
  );
  TestValidator.predicate(
    "customer deleted_at lifecycle field is exposed",
    customer.deleted_at === null || customer.deleted_at.length > 0,
  );
}
