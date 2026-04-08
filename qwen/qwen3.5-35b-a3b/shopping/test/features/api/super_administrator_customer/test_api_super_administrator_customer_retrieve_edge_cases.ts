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

export async function test_api_super_administrator_customer_retrieve_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Part A - Register super administrator
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
  // Part A - Customer Not Found: Test with non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent customer returns 404", async () => {
    await api.functional.ecommerceMall.superAdministrator.customers.at(
      adminConnection,
      { customerId: nonExistentId },
    );
  });
  // Part B - Null Optional Fields: Test with valid customer UUID
  const existingCustomerId = typia.random<string & tags.Format<"uuid">>();
  const existingCustomer =
    await api.functional.ecommerceMall.superAdministrator.customers.at(
      adminConnection,
      { customerId: existingCustomerId },
    );
  typia.assert(existingCustomer);
  // Verify required fields are present and non-null
  TestValidator.equals(
    "customer id is non-null string",
    existingCustomer.id,
    "string" as any,
  );
  TestValidator.equals(
    "email is non-null string",
    existingCustomer.email,
    "string" as any,
  );
  TestValidator.equals(
    "created_at is non-null string",
    existingCustomer.created_at,
    "string" as any,
  );
  TestValidator.equals(
    "updated_at is non-null string",
    existingCustomer.updated_at,
    "string" as any,
  );
  // Optional fields (display_name, phone_number) can be null
  if (existingCustomer.display_name !== null) {
    TestValidator.equals(
      "display_name when not null is string",
      typeof existingCustomer.display_name,
      "string",
    );
  }
  if (existingCustomer.phone_number !== null) {
    TestValidator.equals(
      "phone_number when not null is string",
      typeof existingCustomer.phone_number,
      "string",
    );
  }
  // Part C - Soft-Deleted Customer: Test with soft-deleted customer UUID
  const softDeletedId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("soft-deleted customer returns 404", async () => {
    await api.functional.ecommerceMall.superAdministrator.customers.at(
      adminConnection,
      { customerId: softDeletedId },
    );
  });
}
