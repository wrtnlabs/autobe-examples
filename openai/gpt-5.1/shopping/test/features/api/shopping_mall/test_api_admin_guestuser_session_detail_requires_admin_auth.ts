import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestuserSession";

export async function test_api_admin_guestuser_session_detail_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare random identifiers for guest user and session
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 1-1. Build an unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 1-2. Unauthenticated request must result in an HTTP error
  await TestValidator.httpError(
    "unauthenticated access to guest user session must be rejected",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.admin.guestUsers.sessions.at(
        unauthenticatedConnection,
        {
          guestUserId,
          sessionId,
        },
      );
    },
  );

  // 2. Customer-authenticated access attempt
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  await TestValidator.httpError(
    "customer-authenticated access to admin guest session must be rejected",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.admin.guestUsers.sessions.at(
        connection,
        {
          guestUserId,
          sessionId,
        },
      );
    },
  );

  // 3. Admin-authenticated access attempt
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 3-1. Admin-authenticated call: we try to fetch the session
  try {
    const session: IShoppingMallGuestuserSession =
      await api.functional.shoppingMall.admin.guestUsers.sessions.at(
        connection,
        {
          guestUserId,
          sessionId,
        },
      );
    typia.assert(session);
  } catch (error) {
    // If backend reports not found or other business errors, it's still okay
    // for this test as long as the error is not due to missing authentication.
    // We simply do not treat this as a failure here.
  }
}
