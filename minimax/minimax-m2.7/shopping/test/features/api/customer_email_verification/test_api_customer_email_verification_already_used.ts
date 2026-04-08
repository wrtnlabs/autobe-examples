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

export async function test_api_customer_email_verification_already_used(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to trigger email verification token creation
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Get email verification details
  // Since the join response doesn't directly return the verification token,
  // we need to retrieve it. For testing purposes, we use simulation data.
  // In real scenario, the token would come from the registration email.
  // First, let's get a verification ID - in real flow, this would be from email
  // For E2E testing, we'll use the customer's session to verify
  // Get all verifications or use the verification created during join
  // The verification record is created with customer_id matching our customer
  // 3. Verify the email using the token
  // Since we don't have direct access to the token from join response,
  // we'll simulate by using a test token approach
  // In actual implementation, token comes from email verification link
  // For testing, we verify the customer using PATCH endpoint
  // The token should be the one sent to customer's email
  const verification =
    await api.functional.ecommerceMall.customer.customer.email_verifications.verify(
      customerConnection,
      {
        body: {
          token: authorized.id satisfies string as string,
        } satisfies IEcommerceMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verification);
  // 4. Retrieve the already-used verification using the verification ID
  const alreadyUsedVerification =
    await api.functional.ecommerceMall.customer.customer.email_verifications.at(
      customerConnection,
      {
        verificationId: verification.id,
      },
    );
  typia.assert(alreadyUsedVerification);
  // 5. Validate that verified_at is non-null (token already used)
  TestValidator.predicate(
    "verified_at is not null (token already used)",
    alreadyUsedVerification.verified_at !== null,
  );
  // 6. Validate verified_at is a valid date-time format
  TestValidator.predicate(
    "verified_at is valid date-time format",
    alreadyUsedVerification.verified_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        alreadyUsedVerification.verified_at,
      ),
  );
  // 7. Validate the verification details are still returned correctly
  TestValidator.equals(
    "verification ID matches",
    alreadyUsedVerification.id,
    verification.id,
  );
  TestValidator.equals(
    "customer ID matches",
    alreadyUsedVerification.customer.id,
    authorized.id,
  );
  TestValidator.predicate(
    "token is still present",
    alreadyUsedVerification.token.length > 0,
  );
  TestValidator.predicate(
    "expires_at is a valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      alreadyUsedVerification.expires_at,
    ),
  );
}