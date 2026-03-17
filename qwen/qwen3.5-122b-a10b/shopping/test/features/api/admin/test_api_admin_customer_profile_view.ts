import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can successfully retrieve detailed profile information for any customer account on the platform.
 * This is the primary success path for administrative customer oversight.
 */
export async function test_api_admin_customer_profile_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. View customer profile with random UUID (simulation mode generates valid data)
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customer: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.admin.customers.at(adminConnection, {
      customerId,
    });
  typia.assert(customer);
  // 3. Validate response structure and business logic
  TestValidator.equals(
    "customer id matches requested ID",
    customer.id,
    customerId,
  );
  TestValidator.predicate(
    "email is valid format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      customer.email,
    ),
  );
  TestValidator.predicate(
    "display_name is string or null",
    customer.display_name === null || typeof customer.display_name === "string",
  );
  TestValidator.predicate(
    "phone_number is string or null",
    customer.phone_number === null || typeof customer.phone_number === "string",
  );
  TestValidator.predicate(
    "account_status is valid enum",
    ["active", "suspended", "banned"].includes(customer.account_status),
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(customer.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(customer.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    customer.deleted_at,
    null,
  );
  // 4. Verify security: password_hash is NOT exposed in response
  TestValidator.predicate(
    "password_hash not exposed in response",
    !Object.keys(customer).includes("password_hash"),
  );
}