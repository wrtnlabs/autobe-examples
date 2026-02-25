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

export async function test_api_customer_email_verifications_index_filter_verified_status(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Filtering email verification records by verified status only.
  // Test with verified=true to confirm only verified tokens are returned,
  // then with verified=false to confirm unverified tokens only.
  // Validate correct response structure with pagination and data correctness.
  // Checks business logic filtering critical for verification workflows.
  // 1. Register customer and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  // We now have customer with id and token
  typia.assert(customer);
  customerConnection.headers = { Authorization: customer.token.access };
  // 2. Retrieve email verification records filtered by verified = true
  // Should return only records with verifiedAt != null
  const responseVerifiedTrue =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          verified: true,
          page: 1,
          limit: 50,
          shoppingMallCustomerId: customer.id,
        },
      },
    );
  typia.assert(responseVerifiedTrue);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is 1",
    responseVerifiedTrue.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is <= 50",
    responseVerifiedTrue.pagination.limit <= 50 &&
      responseVerifiedTrue.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    responseVerifiedTrue.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    responseVerifiedTrue.pagination.records >= 0,
  );
  // All email verifications should be verified (verifiedAt != null)
  for (const record of responseVerifiedTrue.data) {
    typia.assert(record);
    TestValidator.predicate(
      `record ${record.id} verifiedAt is not null for verified=true filter`,
      record.verifiedAt !== null,
    );
    TestValidator.equals(
      `record ${record.id} customer id matches`,
      record.customer.id,
      customer.id,
    );
  }
  // 3. Retrieve email verification records filtered by verified = false
  // Should return only records with verifiedAt == null
  const responseVerifiedFalse =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          verified: false,
          page: 1,
          limit: 50,
          shoppingMallCustomerId: customer.id,
        },
      },
    );
  typia.assert(responseVerifiedFalse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page is 1",
    responseVerifiedFalse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is <= 50",
    responseVerifiedFalse.pagination.limit <= 50 &&
      responseVerifiedFalse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    responseVerifiedFalse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    responseVerifiedFalse.pagination.records >= 0,
  );
  // All email verifications should be unverified (verifiedAt == null)
  for (const record of responseVerifiedFalse.data) {
    typia.assert(record);
    TestValidator.predicate(
      `record ${record.id} verifiedAt is null for verified=false filter`,
      record.verifiedAt === null,
    );
    TestValidator.equals(
      `record ${record.id} customer id matches`,
      record.customer.id,
      customer.id,
    );
  }
}
