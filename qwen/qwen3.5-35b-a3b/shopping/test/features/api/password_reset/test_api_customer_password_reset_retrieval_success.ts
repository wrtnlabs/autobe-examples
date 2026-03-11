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

export async function test_api_customer_password_reset_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
        referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create password reset token with valid future expiration
  const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
  const resetToken: IEcommerceMallCustomerPasswordReset = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: customer.id,
    token: typia.random<string & tags.MinLength<1>>(),
    expired_at: futureTime.toISOString(),
    created_at: new Date().toISOString(),
  };
  // 3. Retrieve password reset token by ID
  const retrievedReset: IEcommerceMallCustomerPasswordReset =
    await api.functional.ecommerceMall.customer.password_resets.at(
      customerConnection,
      {
        resetId: resetToken.id,
      },
    );
  typia.assert(retrievedReset);
  // 4. Validate response fields
  TestValidator.equals(
    "reset token ID exists",
    retrievedReset.id,
    resetToken.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedReset.customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "token value has length",
    retrievedReset.token.length > 0,
  );
  // 5. Validate expired_at is in the future
  const expiredDate = new Date(retrievedReset.expired_at);
  const now = new Date();
  TestValidator.predicate("token not expired", expiredDate > now);
  // 6. Validate created_at is before expired_at
  const createdDate = new Date(retrievedReset.created_at);
  TestValidator.predicate("created before expired", createdDate < expiredDate);
}