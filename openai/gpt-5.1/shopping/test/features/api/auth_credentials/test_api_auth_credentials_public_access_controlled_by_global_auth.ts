import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_auth_credentials_public_access_controlled_by_global_auth(
  connection: api.IConnection,
) {
  // 1. Register a customer so that at least one auth credential exists for actor_type "customer".
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // Keep basic facts for later filtering/verification.
  const customerEmail = customerAuthorized.email;

  // 2. Prepare a separate unauthenticated connection by cloning host/options but clearing headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Build a deterministic search request body that attempts to find the credential by email.
  const baseSearchBody = {
    actor_type: "customer",
    login_identifier: customerEmail,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    cursor: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallAuthCredentials.IRequest;

  // 3. Call the endpoint without any Authorization header and branch based on whether it succeeds.
  let publicAccessSucceeded = false;
  try {
    const publicPage: IPageIShoppingMallAuthCredentials.ISummary =
      await api.functional.shoppingMall.authCredentials.index(
        unauthenticatedConnection,
        {
          body: baseSearchBody,
        },
      );
    publicAccessSucceeded = true;
    typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(publicPage);

    // Validate pagination schema is consistent with returned data.
    const pagination = publicPage.pagination;
    const data = publicPage.data;
    TestValidator.predicate(
      "public access: pagination.limit is non-negative",
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      "public access: pagination.records >= data.length",
      pagination.records >= data.length,
    );

    // If public access is allowed, ensure at least one credential exists matching the customer email.
    const hasCustomerCredential = data.some(
      (cred) => cred.email === customerEmail,
    );
    TestValidator.predicate(
      "public access: search results include the customer credential by email",
      hasCustomerCredential,
    );
  } catch {
    publicAccessSucceeded = false;
  }

  // If public access did not succeed, treat the endpoint as admin-only and validate that
  // calling it unauthenticated indeed results in an error.
  if (!publicAccessSucceeded) {
    await TestValidator.error(
      "unauthenticated access must fail when endpoint is restricted",
      async () => {
        await api.functional.shoppingMall.authCredentials.index(
          unauthenticatedConnection,
          {
            body: baseSearchBody,
          },
        );
      },
    );
  }

  // 4. Authenticate as a platform admin to test the authorized behavior.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 5. Call the search endpoint again, now authenticated as platform admin.
  const adminPage: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: baseSearchBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(adminPage);

  const adminPagination = adminPage.pagination;
  const adminData = adminPage.data;

  TestValidator.predicate(
    "admin access: pagination.limit is non-negative",
    adminPagination.limit >= 0,
  );
  TestValidator.predicate(
    "admin access: pagination.records >= data length",
    adminPagination.records >= adminData.length,
  );

  // Ensure the credential created for the customer is visible to the admin search.
  const adminHasCustomerCredential = adminData.some(
    (cred) => cred.email === customerEmail,
  );
  TestValidator.predicate(
    "admin access: search results include the customer credential by email",
    adminHasCustomerCredential,
  );
}
