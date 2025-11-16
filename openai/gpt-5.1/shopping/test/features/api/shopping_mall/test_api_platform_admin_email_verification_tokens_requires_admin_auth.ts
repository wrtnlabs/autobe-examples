import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEmailVerificationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerificationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Ensure platform admin email verification token listing is restricted to
 * platform admins.
 *
 * Business purpose: This test verifies that the email verification token search
 * endpoint under the platform admin namespace cannot be accessed by
 * unauthenticated guests or by other authenticated actor types (seller,
 * customer). Only a platform administrator, authenticated through the dedicated
 * admin join flow, should be able to call the endpoint successfully and receive
 * a structurally valid paginated response.
 *
 * High-level steps:
 *
 * 1. Guest (no Authorization header) calls the endpoint and must fail.
 * 2. Seller account joins (becoming the current actor), then calls and must fail.
 * 3. Customer account joins, then calls and must fail.
 * 4. Platform admin joins, then calls and must succeed and return a valid
 *    pagination wrapper for email verification tokens.
 */
export async function test_api_platform_admin_email_verification_tokens_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Guest (unauthenticated) attempt should fail
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const guestAuthCredentialsId = typia.random<string & tags.Format<"uuid">>();
  const guestRequestBody =
    {} satisfies IShoppingMallEmailVerificationToken.IRequest;

  await TestValidator.error(
    "guest cannot list email verification tokens",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
        guestConnection,
        {
          authCredentialsId: guestAuthCredentialsId,
          body: guestRequestBody,
        },
      );
    },
  );

  // 2. Seller joins and still cannot access the endpoint
  const sellerJoinBody = typia.random<IShoppingMallSellerJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerAuthCredentialsId = typia.random<string & tags.Format<"uuid">>();
  const sellerRequestBody =
    {} satisfies IShoppingMallEmailVerificationToken.IRequest;

  await TestValidator.error(
    "seller cannot list email verification tokens",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
        connection,
        {
          authCredentialsId: sellerAuthCredentialsId,
          body: sellerRequestBody,
        },
      );
    },
  );

  // 3. Customer joins and also cannot access the endpoint
  const customerJoinBody = typia.random<IShoppingMallCustomerAuth.IJoin>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerAuthCredentialsId = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerRequestBody =
    {} satisfies IShoppingMallEmailVerificationToken.IRequest;

  await TestValidator.error(
    "customer cannot list email verification tokens",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
        connection,
        {
          authCredentialsId: customerAuthCredentialsId,
          body: customerRequestBody,
        },
      );
    },
  );

  // 4. Platform admin joins and can access the endpoint successfully
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  const adminAuthCredentialsId = typia.random<string & tags.Format<"uuid">>();
  const adminRequestBody = {
    page: 1,
    pageSize: 10,
  } satisfies IShoppingMallEmailVerificationToken.IRequest;

  const page: IPageIShoppingMallEmailVerificationToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.emailVerificationTokens.index(
      connection,
      {
        authCredentialsId: adminAuthCredentialsId,
        body: adminRequestBody,
      },
    );

  // Validate response structure using typia
  typia.assert<IPageIShoppingMallEmailVerificationToken.ISummary>(page);

  // Basic pagination business assertions
  TestValidator.predicate(
    "pagination current page index is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    page.pagination.pages >= 0,
  );
}
