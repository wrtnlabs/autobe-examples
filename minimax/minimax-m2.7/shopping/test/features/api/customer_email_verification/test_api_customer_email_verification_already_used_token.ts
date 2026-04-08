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

export async function test_api_customer_email_verification_already_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Get the verification token from database (simulated via test data)
  // In real E2E tests, this would query the database to retrieve the token created during registration
  const token = RandomGenerator.alphaNumeric(32);
  // 3. First verification attempt - should succeed if token is valid and not yet verified
  const firstVerification =
    await api.functional.ecommerceMall.customer.customer.email_verifications.verify(
      customerConnection,
      {
        body: {
          token:
            token satisfies IEcommerceMallCustomerEmailVerification.IRequest["token"],
        } satisfies IEcommerceMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(firstVerification);
  // 4. Second verification attempt with the same token - should fail with 400 error
  await TestValidator.error(
    "already verified token should be rejected",
    async () => {
      await api.functional.ecommerceMall.customer.customer.email_verifications.verify(
        customerConnection,
        {
          body: {
            token:
              token satisfies IEcommerceMallCustomerEmailVerification.IRequest["token"],
          } satisfies IEcommerceMallCustomerEmailVerification.IRequest,
        },
      );
    },
  );
}
