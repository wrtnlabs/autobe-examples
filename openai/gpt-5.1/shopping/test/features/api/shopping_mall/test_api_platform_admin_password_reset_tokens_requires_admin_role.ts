import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPasswordResetToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordResetToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Verify that only platform administrators can access password reset token
 * history.
 *
 * Business goal: Ensure PATCH
 * /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/passwordResetTokens
 * is protected by role-based access control so that only platformAdmin actors
 * can query password reset token history for authentication credentials.
 *
 * Test steps:
 *
 * 1. Guest (no Authorization header)
 *
 *    - Create an unauthenticated connection from the provided connection by copying
 *         it and replacing headers with an empty object.
 *    - Call api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index
 *         with a random authCredentialsId (uuid) and a minimal, valid
 *         IShoppingMallPasswordResetToken.IRequest body (e.g., page and
 *         limit).
 *    - Use await TestValidator.error("guest cannot access password reset tokens",
 *         async () => { ... }) to assert that the call fails with some HTTP
 *         error (authorization failure).
 * 2. Authenticated customer
 *
 *    - Join a customer using api.functional.auth.customer.join with a
 *         typia.random<IShoppingMallCustomerAuth.IJoin>() body. This sets
 *         connection.headers.Authorization automatically.
 *    - Attempt to call passwordResetTokens.index with the same authCredentialsId and
 *         request body as above.
 *    - Assert via await TestValidator.error("customer cannot access password reset
 *         tokens", async () => { ... }) that the request is rejected.
 * 3. Authenticated seller
 *
 *    - Join a seller using api.functional.auth.seller.join with
 *         typia.random<IShoppingMallSellerJoin.IRequest>() body. This again
 *         updates connection.headers.Authorization for the seller.
 *    - Attempt the passwordResetTokens.index call and assert rejection with await
 *         TestValidator.error("seller cannot access password reset tokens",
 *         async () => { ... }).
 * 4. Authenticated platform administrator
 *
 *    - Join a platform administrator using api.functional.auth.platformAdmin.join
 *         with a typia.random<IShoppingMallPlatformAdminJoin.IRequest>() body.
 *         This sets Authorization for the admin.
 *    - Call passwordResetTokens.index using:
 *
 *         - AuthCredentialsId: a typia.random<string & tags.Format<"uuid">>()
 *         - Body: a typia.random<IShoppingMallPasswordResetToken.IRequest>()
 *    - Await the call and store the result as
 *         IPageIShoppingMallPasswordResetToken.ISummary.
 *    - Run typia.assert(output) to validate the response type.
 *    - Use TestValidator.predicate and TestValidator.equals to perform simple
 *         business-level checks, for example:
 *
 *         - Pagination.current >= 0
 *         - Pagination.limit >= 0
 *         - Pagination.records >= 0
 *         - Pagination.pages >= 0
 *         - Pagination.records >= output.data.length Do not perform any additional
 *                   structural or per-field type checks.
 *
 * Notes and constraints:
 *
 * - Use only provided DTOs and SDK functions.
 * - Do not import anything beyond the template imports.
 * - Do not reference connection.headers except when creating the separate
 *   unauthenticated connection object.
 * - All API calls must be awaited; all error assertions for async closures must
 *   use await TestValidator.error(...).
 * - Do not intentionally send invalid types or omit required fields.
 */
export async function test_api_platform_admin_password_reset_tokens_requires_admin_role(
  connection: api.IConnection,
) {
  // Guest access: create unauthenticated connection by clearing headers.
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const baseRequestBody =
    typia.random<IShoppingMallPasswordResetToken.IRequest>();

  // 1. Guest cannot access password reset tokens
  await TestValidator.error(
    "guest cannot access password reset tokens",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
        guestConnection,
        {
          authCredentialsId,
          body: baseRequestBody,
        },
      );
    },
  );

  // 2. Customer join and attempt
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: typia.random<IShoppingMallCustomerAuth.IJoin>(),
    });
  typia.assert(customerAuthorized);

  await TestValidator.error(
    "customer cannot access password reset tokens",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
        connection,
        {
          authCredentialsId,
          body: baseRequestBody,
        },
      );
    },
  );

  // 3. Seller join and attempt
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSellerJoin.IRequest>(),
    });
  typia.assert(sellerAuthorized);

  await TestValidator.error(
    "seller cannot access password reset tokens",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
        connection,
        {
          authCredentialsId,
          body: baseRequestBody,
        },
      );
    },
  );

  // 4. Platform admin join and successful access
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    });
  typia.assert(adminAuthorized);

  const adminRequestBody =
    typia.random<IShoppingMallPasswordResetToken.IRequest>();

  const page: IPageIShoppingMallPasswordResetToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
      connection,
      {
        authCredentialsId,
        body: adminRequestBody,
      },
    );

  typia.assert(page);

  const pagination = page.pagination;

  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "records greater or equal to data length",
    pagination.records >= page.data.length,
  );
}
