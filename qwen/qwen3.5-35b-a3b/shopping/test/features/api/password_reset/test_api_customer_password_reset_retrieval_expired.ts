import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for testing
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"email">>()),
      password: typia.assert<string & tags.MinLength<8> & tags.Format<"password">>(RandomGenerator.alphaNumeric(16)),
      href: typia.assert<string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<255>>(typia.random<string & tags.Format<"uri">>()),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate password reset token ID to retrieve
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the password reset token record
  const token = await api.functional.ecommerceMall.customer.password_resets.at(
    customerConnection,
    {
      resetId,
    },
  );
  typia.assert(token);
  // 4. Validate all required fields are present and valid
  TestValidator.equals("reset ID is UUID", token.id !== undefined, true);
  TestValidator.equals(
    "customer ID is UUID",
    token.customer_id !== undefined,
    true,
  );
  TestValidator.equals("token value exists", token.token.length > 0, true);
  TestValidator.equals(
    "expired_at is present",
    token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at is present",
    token.created_at !== undefined,
    true,
  );
  // 5. Validate token structure has all required fields
  TestValidator.notEquals(
    "id and customer_id differ",
    token.id,
    token.customer_id,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(token.created_at)),
  );
}