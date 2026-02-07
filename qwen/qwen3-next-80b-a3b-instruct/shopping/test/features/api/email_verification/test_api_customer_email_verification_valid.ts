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

export async function test_api_customer_email_verification_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create new customer account to generate a verification token in the system
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Use a randomly generated valid UUID to simulate a verification token link
  const verificationToken = typia.random<string & tags.Format<"uuid">>();
  // Validate the email verification endpoint by calling it with a valid UUID format token
  const emailVerification: IShoppingMallCustomerEmailVerification =
    await api.functional.shoppingMall.customer.email_verifications.at(
      customerConnection,
      {
        verificationId: verificationToken,
      },
    );
  typia.assert(emailVerification);
  // No further assertion needed after typia.assert()
}
