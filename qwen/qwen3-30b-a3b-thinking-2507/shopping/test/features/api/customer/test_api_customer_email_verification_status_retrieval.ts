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

export async function test_api_customer_email_verification_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {} as IShoppingMallCustomer.IJoin,
  });
  // Step 2: Get verification record ID from customer data
  if (
    !customer.email_verifications ||
    customer.email_verifications.length === 0
  ) {
    throw new Error("Email verification record not found in customer data");
  }
  const verificationId = customer.email_verifications[0].id;
  // Step 3: Retrieve verification status using customer connection
  const verificationStatus =
    await api.functional.shoppingMall.customer.email_verifications.at(
      customerConnection,
      { verificationId },
    );
  // Step 4: Validate status
  typia.assert(verificationStatus);
  TestValidator.equals(
    "verification status should be pending",
    verificationStatus.status,
    "pending",
  );
}
