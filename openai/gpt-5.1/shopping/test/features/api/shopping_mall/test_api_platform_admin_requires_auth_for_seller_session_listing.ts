import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_platform_admin_requires_auth_for_seller_session_listing(
  connection: api.IConnection,
) {
  // 1. Prepare base test data: random emails and URLs used for auth flows
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const sellerPassword = "SellerPassw0rd!";
  const platformPassword = "AdminPassw0rd!";

  // 2. Register a seller; this also authenticates the seller and sets seller token on connection
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        storeName: RandomGenerator.name(1),
        contactPhone: RandomGenerator.mobile(),
      } satisfies IShoppingMallSellerJoin.IRequest,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Trigger seller-related flows that conceptually create session activity.
  // 3-1. Issue email verification for seller
  const issueEmailResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: {
          email: sellerEmail,
        } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest,
      },
    );
  typia.assert(issueEmailResponse);

  // 3-2. Complete email verification (token is opaque; use random string to satisfy type only)
  const completeEmailResponse: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      {
        body: {
          token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest,
      },
    );
  typia.assert(completeEmailResponse);

  // 3-3. Request password reset for seller
  const resetRequestResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: sellerEmail,
        } satisfies IShoppingMallSellerPasswordResetRequest.IRequest,
      },
    );
  typia.assert(resetRequestResponse);

  // 3-4. Complete password reset (token is opaque; supply random string and new password)
  const resetCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      {
        body: {
          token: RandomGenerator.alphaNumeric(48),
          password: sellerPassword,
        } satisfies IShoppingMallSellerPasswordResetComplete.IRequest,
      },
    );
  typia.assert(resetCompleteResponse);

  // 3-5. Explicit seller login to ensure at least one fresh session exists
  const sellerLoginResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallSellerLogin.IRequest,
    });
  typia.assert(sellerLoginResponse);

  // 4. Prepare a basic seller session listing request payload
  const baseRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    orderBy: "created_at" as "created_at",
    orderDirection: "desc" as "desc",
    created_from: null,
    created_to: null,
    status: null,
    ip_like: null,
  } satisfies IShoppingMallSellerSession.IRequest;

  // Helper to create an unauthenticated clone of the current connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Unauthenticated call must fail with an authorization error
  await TestValidator.error(
    "unauthenticated seller sessions listing should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
        unauthenticatedConnection,
        {
          sellerId,
          body: baseRequestBody,
        },
      );
    },
  );

  // 6. Use a seller token as a non-platformAdmin actor for the same endpoint.
  //    Ensure we are authenticated as the seller (connection already holds seller token).
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href,
      referrer,
    } satisfies IShoppingMallSellerLogin.IRequest,
  });

  await TestValidator.error(
    "seller token must not access platform admin seller sessions listing",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
        connection,
        {
          sellerId,
          body: baseRequestBody,
        },
      );
    },
  );

  // 7. Register and login as platform administrator to obtain a valid admin token
  const platformJoinResponse: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: platformEmail,
        name: RandomGenerator.name(2),
        password: platformPassword,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert(platformJoinResponse);

  const platformLoginResponse: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        email: platformEmail,
        password: platformPassword,
        ip: null,
        href,
        referrer,
      } satisfies IShoppingMallPlatformAdminLogin.IRequest,
    });
  typia.assert(platformLoginResponse);

  // 8. With valid platformAdmin credentials, the sessions listing should succeed
  const page: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.index(
      connection,
      {
        sellerId,
        body: baseRequestBody,
      },
    );
  typia.assert(page);

  // 9. Basic business assertions: pagination and seller ownership consistency
  TestValidator.predicate(
    "pagination limit should be respected or lower",
    page.pagination.limit >= 0 && page.data.length <= page.pagination.limit,
  );

  await ArrayUtil.asyncForEach(page.data, async (session) => {
    typia.assert<IShoppingMallSellerSession.ISummary>(session);
    TestValidator.equals(
      "session summary seller id matches requested seller",
      session.seller.id,
      sellerId,
    );
  });
}
