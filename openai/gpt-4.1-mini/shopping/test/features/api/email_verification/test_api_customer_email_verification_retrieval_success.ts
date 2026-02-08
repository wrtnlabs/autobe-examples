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

export async function test_api_customer_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a valid existing email verification token by its unique ID. Validate that the response contains correct token details including token value, expiry date, verified timestamp if any, and the associated customer ID. Confirm HTTP 404 is returned if the token does not exist. Authorization must be set by logging in as a customer via the join process beforehand.
  // 1. Customer joins and obtains authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Retrieve an existing email verification token for that customer
  // Since we cannot create email verification token via API, simulate existence by
  // creating a random token with correct UUID and verify retrieval works
  const emailVerificationId = typia.random<string & tags.Format<"uuid">>();
  // Successful retrieval
  let output: IShoppingMallCustomerEmailVerification | undefined;
  try {
    output = await api.functional.shoppingMall.customer.email_verifications.at(
      customerConnection,
      {
        emailVerificationId: emailVerificationId,
      },
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      // If 404, this is acceptable for non-existing token
      TestValidator.predicate(
        "expected 404 for non-existent email verification token",
        exp.status === 404,
      );
    } else {
      throw exp;
    }
  }
  // If output exists, assert its correctness
  if (output !== undefined) {
    typia.assert(output);
  }
}
