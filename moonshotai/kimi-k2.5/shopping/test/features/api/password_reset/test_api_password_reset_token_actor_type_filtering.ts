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

/**
 * Test password reset token filtering by actor type for cross-user security auditing.
 *
 * Setup: Authenticate as a customer, then query password reset tokens with actorType
 * filter set to different values: 'customer', 'seller', 'admin', 'superAdmin'.
 * Verify that the filtering correctly returns tokens for the specified actor type only.
 */
export async function test_api_password_reset_token_actor_type_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test filtering by each actor type individually
  const actorTypes: Array<
    "customer" | "seller" | "admin" | "superAdmin" | null | undefined
  > = ["customer", "seller", "admin", "superAdmin", null, undefined];
  for (const actorType of actorTypes) {
    const response =
      await api.functional.ecommerceMall.customer.password_resets.index(
        customerConnection,
        {
          body: {
            actorType,
          } satisfies IEcommerceMallSellerPasswordReset.IRequest,
        },
      );
    typia.assert(response);
  }
  // 3. Test actorType combined with status filter
  const statusFilters: Array<"valid" | "expired" | null | undefined> = [
    "valid",
    "expired",
    null,
    undefined,
  ];
  for (const status of statusFilters) {
    const combinedResponse =
      await api.functional.ecommerceMall.customer.password_resets.index(
        customerConnection,
        {
          body: {
            actorType: "customer",
            status,
          } satisfies IEcommerceMallSellerPasswordReset.IRequest,
        },
      );
    typia.assert(combinedResponse);
  }
  // 4. Test actorType combined with pagination
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "seller",
          page: 1,
          limit: 10,
          sort: "createdAt_DESC",
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 5. Test actorType combined with date range filters
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {
          actorType: "admin",
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 6. Test all actor types with sorting options
  const sortOptions: Array<
    | "createdAt_DESC"
    | "createdAt_ASC"
    | "expiresAt_DESC"
    | "expiresAt_ASC"
    | null
    | undefined
  > = ["createdAt_DESC", "createdAt_ASC", "expiresAt_DESC", "expiresAt_ASC"];
  for (const sort of sortOptions) {
    const sortedResponse =
      await api.functional.ecommerceMall.customer.password_resets.index(
        customerConnection,
        {
          body: {
            actorType: "superAdmin",
            sort,
          } satisfies IEcommerceMallSellerPasswordReset.IRequest,
        },
      );
    typia.assert(sortedResponse);
  }
}
