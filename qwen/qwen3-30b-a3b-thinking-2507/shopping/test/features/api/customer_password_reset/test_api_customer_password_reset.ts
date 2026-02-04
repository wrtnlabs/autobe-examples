import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer account with unique email
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "1234",
      nickname: RandomGenerator.name(),
      mobile: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Verify customer's email using a random 64-character token
  const emailVerificationToken = RandomGenerator.alphaNumeric(64);
  await api.functional.shoppingMall.customer.email_verifications.validate(
    customerConnection,
    {
      body: {
        token: emailVerificationToken satisfies string &
          tags.MinLength<64> &
          tags.MaxLength<64>,
      } satisfies IShoppingMallCustomerEmailVerification.IValidate,
    },
  );
  // 3. Authenticate as verified customer
  const authConnection: api.IConnection = { host: connection.host };
  const authenticated = await authorize_customer_login(authConnection, {
    body: {
      email: customerEmail,
      password: "1234",
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(authenticated);
  // 4. Initiate password reset request (IRequest is an empty object)
  const passwordReset =
    await api.functional.shoppingMall.customer.password_resets.index(
      authConnection,
      {
        body: {} satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(passwordReset);
  // 5. Validate that password reset was initiated successfully
  TestValidator.equals(
    "password reset should be initiated",
    passwordReset.pagination.records,
    1,
  );
}
