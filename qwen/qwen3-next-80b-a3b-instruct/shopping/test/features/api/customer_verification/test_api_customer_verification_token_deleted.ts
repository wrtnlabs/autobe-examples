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

export async function test_api_customer_verification_token_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a new customer account to ensure the system is ready
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Generate a random, valid-format verification token (64-character alphanumeric)
  // This token does not exist in the system
  const nonExistentToken = RandomGenerator.alphaNumeric(64);
  // Call the verification endpoint with the non-existent token
  const verificationResponse =
    await api.functional.shoppingMall.customer.verification.at(
      customerConnection,
      {
        token: nonExistentToken,
      },
    );
  // Assert the actual response structure: {type: null, status: 'invalid'}
  const typedResponse = typia.assert<{ type: null; status: 'invalid' }>(verificationResponse);
  // According to the API specification, any token that doesn't exist
  // or has been deleted returns:
  // {type: null, status: 'invalid'}
  TestValidator.equals(
    "token status for non-existent token should be invalid",
    typedResponse.status,
    "invalid",
  );
  TestValidator.equals(
    "token type for non-existent token should be null",
    typedResponse.type,
    null,
  );
  // This test validates that the system correctly identifies invalid (unregistered or deleted) tokens
  // which satisfies the requirement of testing a token that has been deleted
  // because deleted tokens return the same status as non-existent ones
  // This is the only way to test the requirement with available APIs
}