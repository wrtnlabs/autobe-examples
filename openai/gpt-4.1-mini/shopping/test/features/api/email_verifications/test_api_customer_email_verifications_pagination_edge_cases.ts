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
 * Test pagination edge cases for GET /shoppingMall/customer/email-verifications (PATCH method).
 *
 * This test will:
 * 1. Join as a new customer and authenticate.
 * 2. Query email verifications with normal pagination parameters to establish baseline.
 * 3. Query with page number beyond last page (e.g., very large page) and expect empty results.
 * 4. Query with limit=0 and expect empty results or error depending on API behavior.
 * 5. Query with limit larger than maximum allowed (e.g., 9999) and observe API response.
 * 6. Check authentication enforcement by requesting without token and expect error.
 */
export async function test_api_customer_email_verifications_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new customer and create authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {}, // IShoppingMallCustomer.IJoin has empty object per DTO
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Baseline query with normal valid pagination values
  const normalBody =
    {} satisfies IShoppingMallCustomerEmailVerification.IRequest;
  const normalResult =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      { body: normalBody },
    );
  typia.assert(normalResult);
  // Validations for baseline
  TestValidator.predicate(
    "pagination pages is zero or more",
    normalResult.pagination.pages >= 0,
  );
  // 3. Query with page number beyond last page (simulate with large current page number)
  const pageBeyondLastBody = {
    pagination: {
      current: (normalResult.pagination.pages + 1000) as number,
      limit: normalResult.pagination.limit ?? 20,
    },
  } as any; // We must use partial since IShoppingMallCustomerEmailVerification.IRequest is empty object but API supports pagination in body
  // Since IRequest is empty, we are forced to use partial override to simulate pagination input
  // so we call with empty object (simulation) but logically test with empty responses.
  // Here we directly make the call to check API behavior for out of bounds page
  const beyondLastPageResult =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      { body: { ...pageBeyondLastBody } as any },
    );
  typia.assert(beyondLastPageResult);
  TestValidator.predicate(
    "data empty when page number beyond last",
    beyondLastPageResult.data.length === 0,
  );
  // 4. Query with limit=0 (Zero limit)
  const zeroLimitBody = { pagination: { current: 1, limit: 0 } } as any;
  const zeroLimitResult =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      { body: zeroLimitBody },
    );
  typia.assert(zeroLimitResult);
  TestValidator.predicate(
    "data empty when limit is zero",
    zeroLimitResult.data.length === 0,
  );
  // 5. Query with limit larger than maximum (simulate 9999)
  const largeLimitBody = { pagination: { current: 1, limit: 9999 } } as any;
  const largeLimitResult =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      { body: largeLimitBody },
    );
  typia.assert(largeLimitResult);
  TestValidator.predicate(
    "limit larger than typical max returns data with count <= limit",
    largeLimitResult.data.length <= 9999,
  );
  // 6. Check authentication enforcement by requesting without token
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "request without authentication token should fail",
    401,
    async () => {
      await api.functional.shoppingMall.customer.email_verifications.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
}
