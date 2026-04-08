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

/**
 * Test super administrator can successfully retrieve customer account with complete profile.
 *
 * Validates that a super administrator can access customer profile information including
 * email address, display name, phone number, and account timestamps. Ensures proper
 * authorization flow and complete customer data retrieval.
 *
 * Test Scenario:
 * 1. Super administrator registers and authenticates
 * 2. Super administrator retrieves customer account by UUID
 * 3. Response contains all required profile fields
 * 4. Timestamps are valid and consistent
 * 5. No sensitive data (password_hash) is exposed in response
 */
export async function test_api_super_administrator_customer_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminAuth);
  // 2. Retrieve customer using super administrator with random UUID
  const customerConnection: api.IConnection = { host: connection.host };
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const retrievedCustomer =
    await api.functional.ecommerceMall.superAdministrator.customers.at(
      customerConnection,
      {
        customerId: customerId,
      },
    );
  typia.assert(retrievedCustomer);
  // 3. Validate response contains all required fields
  TestValidator.equals("customer id", retrievedCustomer.id, customerId);
  TestValidator.equals(
    "created_at is valid timestamp",
    typeof retrievedCustomer.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is valid timestamp",
    typeof retrievedCustomer.updated_at,
    "string",
  );
  // 4. Verify timestamp consistency
  const createdAt = new Date(retrievedCustomer.created_at);
  const updatedAt = new Date(retrievedCustomer.updated_at);
  TestValidator.predicate("created_at is valid date", createdAt.getTime() > 0);
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
  // 5. Verify no sensitive data exposed
  TestValidator.equals(
    "no password_hash field in response",
    "password_hash" in retrievedCustomer,
    false,
  );
}
