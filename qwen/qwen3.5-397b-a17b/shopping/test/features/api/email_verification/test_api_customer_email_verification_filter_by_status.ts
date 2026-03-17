import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
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

/**
 * Test customer email verification filtering by status.
 *
 * This test validates that customers can filter their email verification
 * records by verification status (verified vs unverified). The test:
 * 1. Registers a new customer account (which creates a verification token)
 * 2. Retrieves verification history with verified=true filter
 * 3. Retrieves verification history with verified=false filter
 * 4. Retrieves all verification records without filter
 * 5. Validates filtering logic works correctly
 */
export async function test_api_customer_email_verification_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer (creates email verification token)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test with verified=true filter (should return only verified records)
  const verifiedResponse =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          verified: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedResponse);
  // Validate all returned records have verified_at not null
  for (const record of verifiedResponse.data) {
    TestValidator.predicate(
      `verified record ${record.id} should have verified_at`,
      () => record.verified_at !== null,
    );
  }
  // 3. Test with verified=false filter (should return only unverified records)
  const unverifiedResponse =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          verified: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(unverifiedResponse);
  // Validate all returned records have verified_at null
  for (const record of unverifiedResponse.data) {
    TestValidator.predicate(
      `unverified record ${record.id} should have null verified_at`,
      () => record.verified_at === null,
    );
  }
  // 4. Test without filter (should return all records)
  const allResponse =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(allResponse);
  // 5. Validate pagination and record counts
  TestValidator.predicate(
    "all records count should equal verified + unverified",
    () =>
      allResponse.data.length ===
      verifiedResponse.data.length + unverifiedResponse.data.length,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    () => allResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    () => allResponse.pagination.records === allResponse.data.length,
  );
  // 6. Validate all records belong to the authenticated customer
  for (const record of allResponse.data) {
    TestValidator.equals(
      `record ${record.id} customer ID`,
      record.customer.id,
      customer.id,
    );
  }
}
