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
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_auth_credentials_search_by_actor_type_and_email(
  connection: api.IConnection,
) {
  // 1. Register a customer with a known email so that a customer credential exists.
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // optional ip is omitted, let backend infer
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Optionally create a seller credential for diversity (not used in filter result).
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 3. Optionally create a platform admin credential for diversity.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // 4. Build search request filtering by actor_type and login_identifier/email.
  const requestBody = {
    actor_type: "customer",
    login_identifier: customerEmail,
    status: undefined,
    has_risk_flags: null,
    created_from: null,
    created_to: null,
    page: null,
    limit: null,
    cursor: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const page: IPageIShoppingMallAuthCredentials.ISummary =
    await api.functional.shoppingMall.authCredentials.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(page);

  const pagination = page.pagination;
  const data = page.data;

  // Basic pagination coherence
  TestValidator.predicate("records must be >= 0", pagination.records >= 0);
  TestValidator.predicate("limit must be >= 0", pagination.limit >= 0);
  TestValidator.predicate("pages must be >= 0", pagination.pages >= 0);

  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages should be at least 1 when records > 0",
      pagination.pages >= 1,
    );
  }

  // We expect at least one credential for the created customer.
  TestValidator.predicate(
    "search results must include at least one credential",
    data.length >= 1,
  );

  // All returned credentials must be for actor_type "customer" and with the expected email.
  for (const credential of data) {
    typia.assert<IShoppingMallAuthCredentials.ISummary>(credential);

    TestValidator.equals(
      "credential actor_type must be 'customer'",
      credential.actor_type,
      "customer",
    );

    TestValidator.equals(
      "credential email must match customer email filter",
      credential.email,
      customerEmail,
    );

    // Validate risk flag summary fields are present and well-typed.
    TestValidator.predicate(
      "hasActiveRiskFlags must be boolean",
      typeof credential.hasActiveRiskFlags === "boolean",
    );

    // If actor info is populated, ensure it matches a customer summary.
    if (credential.actor !== undefined) {
      typia.assert<IShoppingMallAuthCredentialsActor.ISummary>(
        credential.actor,
      );

      TestValidator.equals(
        "actorType discriminator should be 'customer' for filtered results",
        credential.actor.actorType,
        "customer",
      );

      TestValidator.predicate(
        "customer summary must be defined when actorType is 'customer'",
        credential.actor.customer !== undefined,
      );

      if (credential.actor.customer !== undefined) {
        typia.assert<IShoppingMallCustomer.ISummary>(credential.actor.customer);
      }
    }
  }
}
