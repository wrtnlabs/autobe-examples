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

export async function test_api_customer_email_verification_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain authentication and trigger email verification token generation
  const customerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_customer_join(customerConnection, {});
  // 2. Generate a valid token format (UUID format matching the regex constraint)
  const token = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the email verification endpoint with the valid verification token
  const verification =
    await api.functional.ecommerceMall.customer.customer.email_verifications.verify(
      customerConnection,
      {
        body: {
          token: token satisfies string as IEcommerceMallCustomerEmailVerification.IRequest["token"],
        } satisfies IEcommerceMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verification);
  // 4. Verify the response body contains the verified_at timestamp (not null)
  TestValidator.equals(
    "verified_at should be set",
    verification.verified_at !== null,
    true,
  );
  // 5. Verify the customer email matches our registered customer
  TestValidator.equals(
    "customer email matches registered email",
    verification.customer.email,
    registered.email,
  );
}
