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

export async function test_api_platform_admin_filter_password_reset_tokens_by_creation_and_consumption(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to ensure we have an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Use a synthetic authCredentialsId since we don't have a direct way
  // to obtain a real credentials ID from the provided APIs.
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Helper to run a single filter query and validate structural correctness,
  // then run additional semantic checks via a callback.
  const queryAndValidate = async (
    title: string,
    body: IShoppingMallPasswordResetToken.IRequest,
    postValidate?: (
      page: IPageIShoppingMallPasswordResetToken.ISummary,
    ) => void,
  ) => {
    const page: IPageIShoppingMallPasswordResetToken.ISummary =
      await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
        connection,
        {
          authCredentialsId,
          body,
        },
      );
    typia.assert(page);

    // Basic structural expectations
    TestValidator.predicate(
      `${title}: pagination current is non-negative`,
      page.pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title}: pagination limit is non-negative`,
      page.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title}: pagination records is non-negative`,
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title}: pagination pages is non-negative`,
      page.pagination.pages >= 0,
    );

    if (postValidate) postValidate(page);
  };

  // Prepare pagination numbers with proper typia tags
  const pageOne = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    1,
  );
  const limitTwenty = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >(20);
  const limitFifty = typia.assert<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >(50);

  // 3. Baseline query with minimal filters (only pagination fields)
  await queryAndValidate("baseline", {
    page: pageOne,
    limit: limitTwenty,
  });

  // Generate some ISO date-time ranges around "now" for filter testing
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const future = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour later

  const createdFrom = typia.assert<string & tags.Format<"date-time">>(
    past.toISOString(),
  );
  const createdTo = typia.assert<string & tags.Format<"date-time">>(
    future.toISOString(),
  );

  const expiresFrom = typia.assert<string & tags.Format<"date-time">>(
    now.toISOString(),
  );
  const expiresTo = typia.assert<string & tags.Format<"date-time">>(
    new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
  ); // 24 hours later

  // 4. Filter by createdAt range
  await queryAndValidate(
    "createdAt range",
    {
      createdAtFrom: createdFrom,
      createdAtTo: createdTo,
      limit: limitFifty,
    },
    (page) => {
      if (page.data.length === 0) return;

      for (const token of page.data) {
        TestValidator.predicate(
          "createdAt range: token.created_at >= createdAtFrom",
          token.created_at >= createdFrom,
        );
        TestValidator.predicate(
          "createdAt range: token.created_at <= createdAtTo",
          token.created_at <= createdTo,
        );
      }
    },
  );

  // 5. Filter by expiresAt range
  await queryAndValidate(
    "expiresAt range",
    {
      expiresAtFrom: expiresFrom,
      expiresAtTo: expiresTo,
      limit: limitFifty,
    },
    (page) => {
      if (page.data.length === 0) return;

      for (const token of page.data) {
        TestValidator.predicate(
          "expiresAt range: token.expires_at >= expiresFrom",
          token.expires_at >= expiresFrom,
        );
        TestValidator.predicate(
          "expiresAt range: token.expires_at <= expiresTo",
          token.expires_at <= expiresTo,
        );
      }
    },
  );

  // 6. Filter by consumed=true (should only return tokens with used_at set)
  await queryAndValidate(
    "consumed=true",
    {
      consumed: true,
      limit: limitFifty,
    },
    (page) => {
      if (page.data.length === 0) return;

      for (const token of page.data) {
        TestValidator.predicate(
          "consumed=true: token.used_at is not null or undefined",
          token.used_at !== null && token.used_at !== undefined,
        );
      }
    },
  );

  // 7. Filter by consumed=false (should only return tokens without used_at)
  await queryAndValidate(
    "consumed=false",
    {
      consumed: false,
      limit: limitFifty,
    },
    (page) => {
      if (page.data.length === 0) return;

      for (const token of page.data) {
        TestValidator.predicate(
          "consumed=false: token.used_at is null or undefined",
          token.used_at === null || token.used_at === undefined,
        );
      }
    },
  );
}
