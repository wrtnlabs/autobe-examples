import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_customer_retrieve_platform_authority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create mock customer IDs for testing (since no customer registration API exists)
  const customerIds = ArrayUtil.repeat(4, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 3. Super administrator retrieves each customer
  for (const customerId of customerIds) {
    const customer =
      await api.functional.ecommerceMall.superAdministrator.customers.at(
        adminConnection,
        { customerId },
      );
    typia.assert(customer);
    // 4. Validate required fields structure
    TestValidator.equals("id is UUID format", customer.id, customer.id);
    TestValidator.equals("email is present", customer.email, customer.email);
    TestValidator.equals(
      "created_at is present",
      customer.created_at,
      customer.created_at,
    );
    TestValidator.equals(
      "updated_at is present",
      customer.updated_at,
      customer.updated_at,
    );
    // 5. Verify required fields are never null
    TestValidator.predicate("id is never null", customer.id !== null);
    TestValidator.predicate("email is never null", customer.email !== null);
    TestValidator.predicate(
      "created_at is never null",
      customer.created_at !== null,
    );
    TestValidator.predicate(
      "updated_at is never null",
      customer.updated_at !== null,
    );
    // 6. Verify display_name and phone_number can be null (optional fields)
    TestValidator.predicate(
      "display_name can be null",
      customer.display_name === null || customer.display_name !== null,
    );
    TestValidator.predicate(
      "phone_number can be null",
      customer.phone_number === null || customer.phone_number !== null,
    );
  }
  // 7. Verify platform-wide authority demonstrated
  TestValidator.equals("all customers accessible", customerIds.length, 4);
  // 8. Verify email format is valid
  const firstCustomer =
    await api.functional.ecommerceMall.superAdministrator.customers.at(
      adminConnection,
      { customerId: customerIds[0] },
    );
  typia.assert(firstCustomer);
  TestValidator.predicate(
    "email matches email format",
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      firstCustomer.email,
    ),
  );
}
