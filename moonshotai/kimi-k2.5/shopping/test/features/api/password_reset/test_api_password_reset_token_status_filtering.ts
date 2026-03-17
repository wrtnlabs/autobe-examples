import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_token_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test filtering by 'valid' status
  const validResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "valid",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(validResponse);
  // 3. Test filtering by 'expired' status
  const expiredResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredResponse);
  // 4. Test with null status (no filter) - returns all tokens
  const allResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(allResponse);
  // 5. Test combined filters - status + actorType
  const combinedResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "valid",
          actorType: "customer",
          page: 1,
          limit: 5,
          sort: "createdAt_DESC",
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // 6. Test combined filters - status + date range
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString();
  const dateRangeResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "expired",
          startDate,
          endDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 7. Test pagination with status filter
  const page2Response =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "valid",
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    page2Response.pagination.limit === 5,
  );
  // 8. Test sorting options with status filter
  const sortedResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          status: "valid",
          sort: "expiresAt_ASC",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(sortedResponse);
}
