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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_auth_credentials_filter_by_status_and_risk_flags(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Register a new seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Helper to validate one page of credentials with optional actor_type expectation
  const validatePage = (
    titlePrefix: string,
    page: IPageIShoppingMallAuthCredentials.ISummary,
    expectedActorType: string | null,
  ): void => {
    typia.assert<IPageIShoppingMallAuthCredentials.ISummary>(page);

    const pagination = page.pagination;
    // Basic pagination sanity
    TestValidator.predicate(
      `${titlePrefix} - pagination.current non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pagination.limit non-negative`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pagination.records non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pagination.pages non-negative`,
      pagination.pages >= 0,
    );

    // Each credential summary must satisfy basic invariants
    for (const credential of page.data) {
      typia.assert<IShoppingMallAuthCredentials.ISummary>(credential);

      if (expectedActorType !== null) {
        TestValidator.equals(
          `${titlePrefix} - credential.actor_type matches expectedActorType`,
          credential.actor_type,
          expectedActorType,
        );
      }

      // hasActiveRiskFlags vs riskFlagCount relationship
      if (credential.riskFlagCount !== undefined) {
        TestValidator.predicate(
          `${titlePrefix} - riskFlagCount non-negative when defined`,
          credential.riskFlagCount >= 0,
        );
        if (credential.riskFlagCount === 0) {
          TestValidator.predicate(
            `${titlePrefix} - hasActiveRiskFlags must be false when riskFlagCount is 0`,
            credential.hasActiveRiskFlags === false,
          );
        } else {
          TestValidator.predicate(
            `${titlePrefix} - hasActiveRiskFlags must be true when riskFlagCount >= 1`,
            credential.hasActiveRiskFlags === true,
          );
        }
      }

      // Validate actor polymorphism and alignment
      const actor = credential.actor;
      if (actor !== undefined) {
        typia.assert<IShoppingMallAuthCredentialsActor.ISummary>(actor);

        if (actor.actorType === "customer") {
          // Customer summary must exist; others must be undefined
          TestValidator.predicate(
            `${titlePrefix} - actor.customer defined when actorType is customer`,
            actor.customer !== undefined,
          );
          TestValidator.predicate(
            `${titlePrefix} - actor.seller undefined when actorType is customer`,
            actor.seller === undefined,
          );
          TestValidator.predicate(
            `${titlePrefix} - actor.platformAdmin undefined when actorType is customer`,
            actor.platformAdmin === undefined,
          );
          if (actor.customer !== undefined) {
            typia.assert<IShoppingMallCustomer.ISummary>(actor.customer);
          }
        } else if (actor.actorType === "seller") {
          TestValidator.predicate(
            `${titlePrefix} - actor.seller defined when actorType is seller`,
            actor.seller !== undefined,
          );
          TestValidator.predicate(
            `${titlePrefix} - actor.customer undefined when actorType is seller`,
            actor.customer === undefined,
          );
          TestValidator.predicate(
            `${titlePrefix} - actor.platformAdmin undefined when actorType is seller`,
            actor.platformAdmin === undefined,
          );
          if (actor.seller !== undefined) {
            typia.assert<IShoppingMallSeller.ISummary>(actor.seller);
          }
        } else if (actor.actorType === "platformadmin") {
          TestValidator.predicate(
            `${titlePrefix} - actor.platformAdmin defined when actorType is platformadmin`,
            actor.platformAdmin !== undefined,
          );
          TestValidator.predicate(
            `${titlePrefix} - actor.customer undefined when actorType is platformadmin`,
            actor.customer === undefined,
          );
          TestValidator.predicate(
            `${titlePrefix} - actor.seller undefined when actorType is platformadmin`,
            actor.seller === undefined,
          );
          if (actor.platformAdmin !== undefined) {
            typia.assert<IShoppingMallPlatformAdmin.ISummary>(
              actor.platformAdmin,
            );
          }
        }
      }
    }
  };

  // 3. Generic search without over-constraining status/has_risk_flags
  const genericRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const genericPage = await api.functional.shoppingMall.authCredentials.index(
    connection,
    {
      body: genericRequestBody,
    },
  );
  validatePage("generic search", genericPage, null);

  // 4. Filter by actor_type = "customer"
  const customerFilterBody = {
    actor_type: "customer",
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const customerPage = await api.functional.shoppingMall.authCredentials.index(
    connection,
    {
      body: customerFilterBody,
    },
  );
  validatePage("customer actor_type filter", customerPage, "customer");

  // 5. Filter by actor_type = "seller"
  const sellerFilterBody = {
    actor_type: "seller",
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAuthCredentials.IRequest;

  const sellerPage = await api.functional.shoppingMall.authCredentials.index(
    connection,
    {
      body: sellerFilterBody,
    },
  );
  validatePage("seller actor_type filter", sellerPage, "seller");
}
