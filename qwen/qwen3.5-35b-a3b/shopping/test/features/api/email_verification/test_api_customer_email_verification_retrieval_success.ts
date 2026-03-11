import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful retrieval of a customer's email verification record.
 * 1. Register a new customer account
 * 2. Create customer connection with token
 * 3. Retrieve email verification record
 * 4. Validate response structure and data
 */
export async function test_api_customer_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joined: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(joined);
  // 2. Create customer-specific connection
  const customerAuthConnection: api.IConnection = { host: connection.host };
  customerAuthConnection.headers = {
    authorization: `Bearer ${joined.token.access}`,
  };
  // 3. Generate a valid verificationId for retrieval test
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve email verification record
  const verification: IEcommerceMallCustomerEmailVerification =
    await api.functional.ecommerceMall.customer.email_verifications.at(
      customerAuthConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 5. Validate response structure
  TestValidator.equals(
    "verification id matches",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "customer id matches authenticated customer",
    verification.customerId,
    joined.id,
  );
  TestValidator.predicate("token is non-empty string", !!verification.token);
  TestValidator.equals(
    "used at is null for pending",
    verification.usedAt,
    null,
  );
  TestValidator.equals(
    "deleted at is null for active record",
    verification.deletedAt,
    null,
  );
}