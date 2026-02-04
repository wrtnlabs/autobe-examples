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

export async function test_api_customer_expired_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create customer to generate verification record
  const customer = await authorize_customer_join(connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customer);
  // Confirm verification records exist for this customer
  if (
    !customer.email_verifications ||
    customer.email_verifications.length === 0
  ) {
    throw new Error("Customer has no email verification records");
  }
  // Retrieve the first email verification record
  const verification =
    await api.functional.shoppingMall.customer.email_verifications.at(
      connection,
      {
        verificationId: customer.email_verifications[0].id,
      },
    );
  typia.assert(verification);
  // Verify verification status is correctly reported as 'expired'
  TestValidator.equals(
    "email verification status should be 'expired'",
    verification.status,
    "expired",
  );
}
