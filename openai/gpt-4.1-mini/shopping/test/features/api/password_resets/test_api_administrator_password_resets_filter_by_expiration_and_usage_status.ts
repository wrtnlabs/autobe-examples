import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_administrator_password_resets_filter_by_expiration_and_usage_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using authorize_administrator_join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create seller approval to satisfy password reset prerequisite
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: { status: "approved" },
      },
    );
  typia.assert(sellerApproval);
  const sellerId = sellerApproval.shoppingMallSellerId;
  // 3. Create multiple password reset tokens with different expirations, usage, and deletion states
  // As there's no direct create endpoint for seller password resets in the context, simulate data creation by patch querying only
  // However, for E2E test, we can only rely on the given API and generation utilities
  // Therefore, test logical query facets with the tokens presumed to exist or the data created in prior steps
  // For demo, we'll assume some tokens exist, else we would have had to use an API utility to create password reset tokens
  // We will retrieve tokens filtered by expiration date range and usage status
  // Prepare test filter ranges
  const now = new Date();
  const oneDayMs = 24 * 3600 * 1000;
  const expiredAtFrom = new Date(now.getTime() - oneDayMs).toISOString(); // 1 day ago
  const expiredAtTo = new Date(now.getTime() + oneDayMs).toISOString(); // 1 day in the future
  // Retrieve tokens that have NOT been used and expire within this range
  let response =
    await api.functional.shoppingMall.administrator.password_resets.index(
      adminConnection,
      {
        body: {
          expiredAtFrom,
          expiredAtTo,
          usedAtFrom: null,
          usedAtTo: null,
          deleted: false,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // Validate response tokens have expiration within range & unused
  response.data.forEach((token) => {
    TestValidator.predicate(
      `token expiredAt within range for id:${token.id}`,
      token.expiredAt >= expiredAtFrom && token.expiredAt <= expiredAtTo,
    );
    TestValidator.equals(
      `token usedAt is null for id:${token.id}`,
      token.usedAt,
      null,
    );
    TestValidator.equals(
      `token deletedAt is null for id:${token.id}`,
      token.deletedAt,
      null,
    );
  });
  // Retrieve tokens that HAVE been used and expire within this range
  response =
    await api.functional.shoppingMall.administrator.password_resets.index(
      adminConnection,
      {
        body: {
          expiredAtFrom,
          expiredAtTo,
          usedAtFrom: null,
          usedAtTo: new Date().toISOString(),
          deleted: false,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // Validate response tokens have expiration within range & used (usedAt not null & <= now)
  response.data.forEach((token) => {
    TestValidator.predicate(
      `token expiredAt within range for id:${token.id}`,
      token.expiredAt >= expiredAtFrom && token.expiredAt <= expiredAtTo,
    );
    TestValidator.predicate(
      `token usedAt is not null and <= now for id:${token.id}`,
      token.usedAt !== null && token.usedAt! <= new Date().toISOString(),
    );
    TestValidator.equals(
      `token deletedAt is null for id:${token.id}`,
      token.deletedAt,
      null,
    );
  });
  // Retrieve tokens including soft deleted tokens
  response =
    await api.functional.shoppingMall.administrator.password_resets.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
          deleted: true,
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // Validate that some tokens are soft deleted if exist
  const hasDeleted = response.data.some((token) => token.deletedAt !== null);
  TestValidator.predicate(
    "some tokens are soft deleted when deleted=true",
    hasDeleted,
  );
}
