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

export async function test_api_customer_email_verification_history_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account (creates email verification token)
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
  // 2. Retrieve email verification history
  const verificationHistory =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verificationHistory);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    verificationHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    verificationHistory.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    verificationHistory.pagination.limit === 20,
  );
  TestValidator.predicate(
    "has at least one record",
    verificationHistory.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    verificationHistory.pagination.pages >= 1,
  );
  // 4. Validate data array exists and has records
  TestValidator.predicate(
    "data array exists",
    Array.isArray(verificationHistory.data),
  );
  TestValidator.predicate(
    "at least one verification record",
    verificationHistory.data.length >= 1,
  );
  // 5. Validate first verification record structure (from registration)
  const firstRecord = verificationHistory.data[0]!;
  // 6. Validate customer info in verification record matches registered customer
  TestValidator.equals(
    "customer email matches",
    firstRecord.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer nickname matches",
    firstRecord.customer.nickname,
    customer.nickname,
  );
  TestValidator.equals(
    "customer id matches",
    firstRecord.customer.id,
    customer.id,
  );
  // 7. Verify verified_at is null or valid date (registration token may not be verified yet)
  TestValidator.predicate(
    "verified_at is null or date",
    firstRecord.verified_at === null ||
      new Date(firstRecord.verified_at).getTime() > 0,
  );
  // 8. Verify records are sorted by created_at descending (most recent first)
  if (verificationHistory.data.length > 1) {
    for (let i = 1; i < verificationHistory.data.length; i++) {
      const prevRecord = verificationHistory.data[i - 1]!;
      const currRecord = verificationHistory.data[i]!;
      TestValidator.predicate(
        `record ${i} is older than record ${i - 1}`,
        new Date(prevRecord.created_at).getTime() >=
          new Date(currRecord.created_at).getTime(),
      );
    }
  }
}
