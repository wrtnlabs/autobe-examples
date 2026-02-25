import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a new customer can successfully register using a unique email and strong password.
  // It confirms that the join endpoint returns the correct authorized session including JWT tokens and user profile data.
  // The test creates a fresh connection and calls authorize_customer_join utility to benefit from token injection and proper setup.
  const customerConnection: api.IConnection = { host: connection.host };
  // Prepare unique customer join data
  const joinInput: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // Execute customer join (registration) using the utility function
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  // Assert that the response matches the expected authorized customer type and properties
  typia.assert(authorizedCustomer);
  // Validate fields are correctly returned
  TestValidator.predicate(
    "authorization token access exists",
    () => authorizedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh exists",
    () => authorizedCustomer.token.refresh.length > 0,
  );
  // Validate customer profile consistent with input
  TestValidator.equals(
    "customer email",
    authorizedCustomer.email,
    joinInput.email,
  );
  TestValidator.predicate(
    "customer id is uuid format",
    /^[0-9a-fA-F-]{36}$/.test(authorizedCustomer.id),
  );
  // Validate timestamps
  TestValidator.predicate("createdAt is ISO date-time", () => {
    try {
      new Date(authorizedCustomer.createdAt).toISOString();
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updatedAt is ISO date-time", () => {
    try {
      new Date(authorizedCustomer.updatedAt).toISOString();
      return true;
    } catch {
      return false;
    }
  });
  // deletedAt should be null after successful join
  TestValidator.equals("deletedAt is null", authorizedCustomer.deletedAt, null);
  // DisplayName and phoneNumber could be null
  TestValidator.predicate(
    "displayName is string or null",
    typeof authorizedCustomer.displayName === "string" ||
      authorizedCustomer.displayName === null,
  );
  TestValidator.predicate(
    "phoneNumber is string or null",
    typeof authorizedCustomer.phoneNumber === "string" ||
      authorizedCustomer.phoneNumber === null,
  );
  // Authorization token expiration timestamps are ISO date-time strings
  TestValidator.predicate("token expired_at is ISO date-time", () => {
    try {
      new Date(authorizedCustomer.token.expired_at).toISOString();
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("token refreshable_until is ISO date-time", () => {
    try {
      new Date(authorizedCustomer.token.refreshable_until).toISOString();
      return true;
    } catch {
      return false;
    }
  });
  // Confirm no prior authentication required by base connection
  const anonymousCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  // Call join again with anonymous connection to verify no auth required
  const anonymousJoin = await authorize_customer_join(
    anonymousCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(anonymousJoin);
  // Ensure the anonymous join session also matches expectation
  TestValidator.predicate(
    "anonymous join email format",
    anonymousJoin.email.includes("@"),
  );
}
