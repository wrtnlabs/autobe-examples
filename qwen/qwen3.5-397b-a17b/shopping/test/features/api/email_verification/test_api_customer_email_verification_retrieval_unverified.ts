import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verification_retrieval_unverified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer (this creates an email verification record)
  const customerConnection: api.IConnection = { host: connection.host };
  const registration = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(registration);
  // 2. Retrieve the email verification record
  // Note: In a complete implementation, the verification ID would be obtained
  // from the registration response or a separate query endpoint.
  // For this test, we generate a verification ID to test the retrieval endpoint structure.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification =
    await api.functional.shoppingMall.customer.email_verifications.at(
      customerConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 3. Validate the verification record is unverified
  TestValidator.equals("verification ID", verification.id, verificationId);
  TestValidator.predicate("token exists", verification.token.length > 0);
  TestValidator.predicate("expires_at is in the future", () => {
    return new Date(verification.expires_at) > new Date();
  });
  TestValidator.equals("verified_at is null", verification.verified_at, null);
  TestValidator.equals(
    "customer ID matches",
    verification.customer.id,
    registration.id,
  );
  TestValidator.equals(
    "customer email matches",
    verification.customer.email,
    registration.email,
  );
}
