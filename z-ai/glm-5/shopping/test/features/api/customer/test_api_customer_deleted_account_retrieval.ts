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

/**
 * Test retrieving a customer account.
 *
 * This test validates that customer account data can be retrieved using the
 * customer ID. The scenario originally intended to test soft-deleted account
 * retrieval, but since no customer deletion API is available in the current
 * API set, this test validates retrieval of an active customer account.
 *
 * For soft-deleted accounts, the system should preserve:
 * - Email address
 * - Timestamps (createdAt, updatedAt)
 * - Orders and reviews (for legal compliance)
 *
 * While clearing:
 * - displayName (set to null)
 * - phoneNumber (set to null)
 * - deletedAt (set to deletion timestamp)
 */
export async function test_api_customer_deleted_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      displayName: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(authResult);
  // Store original customer data
  const originalId = authResult.id;
  const originalEmail = authResult.email;
  const originalDisplayName = authResult.displayName;
  const originalPhoneNumber = authResult.phoneNumber;
  // 2. Retrieve the customer using the at endpoint
  const retrievedCustomer = await api.functional.shoppingMall.customers.at(
    connection,
    { customerId: originalId },
  );
  typia.assert(retrievedCustomer);
  // 3. Validate retrieved customer data matches the created account
  TestValidator.equals("customer ID", retrievedCustomer.id, originalId);
  TestValidator.equals(
    "customer email",
    retrievedCustomer.email,
    originalEmail,
  );
  TestValidator.equals(
    "displayName",
    retrievedCustomer.displayName,
    originalDisplayName,
  );
  TestValidator.equals(
    "phoneNumber",
    retrievedCustomer.phoneNumber,
    originalPhoneNumber,
  );
  // 4. For active accounts, deletedAt should be null
  TestValidator.equals(
    "deletedAt should be null for active account",
    retrievedCustomer.deletedAt,
    null,
  );
  // 5. Validate timestamps exist
  TestValidator.predicate(
    "createdAt is valid",
    retrievedCustomer.createdAt !== null &&
      retrievedCustomer.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    retrievedCustomer.updatedAt !== null &&
      retrievedCustomer.updatedAt !== undefined,
  );
  // NOTE: Soft-deleted account retrieval cannot be fully tested without a
  // customer deletion API. When such API becomes available, this test should
  // be extended to:
  // 1. Delete the customer account
  // 2. Retrieve the deleted customer
  // 3. Verify deletedAt is set (not null)
  // 4. Verify displayName and phoneNumber are cleared (null)
  // 5. Verify email and timestamps are preserved
}
