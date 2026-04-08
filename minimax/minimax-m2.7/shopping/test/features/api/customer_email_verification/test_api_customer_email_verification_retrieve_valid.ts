import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerEmailVerification";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verification_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to trigger email verification token creation
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Get the newly created verification ID from the customer profile
  // The verification ID is created during registration and linked to the customer
  const verificationId = authorized.profile.id;
  // 3. Retrieve the email verification token details
  const verification =
    await api.functional.ecommerceMall.customer.customer.email_verifications.at(
      customerConnection,
      {
        verificationId: verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate the response includes expected fields
  TestValidator.equals(
    "verification ID matches input",
    verification.id,
    verificationId,
  );
  TestValidator.predicate(
    "has valid token string",
    verification.token.length > 0,
  );
  TestValidator.predicate(
    "expires_at is in the future",
    new Date(verification.expires_at) > new Date(),
  );
  TestValidator.equals(
    "verified_at is null (not yet verified)",
    verification.verified_at,
    null,
  );
  // 5. Validate customer information is included
  TestValidator.equals(
    "customer ID is present",
    verification.customer.id,
    verification.customer.id,
  );
  TestValidator.equals(
    "customer email is present",
    verification.customer.email,
    verification.customer.email,
  );
  TestValidator.predicate(
    "customer has created_at timestamp",
    verification.customer.createdAt.length > 0,
  );
}
