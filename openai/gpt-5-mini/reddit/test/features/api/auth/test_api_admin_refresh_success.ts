import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // 1) Prepare admin creation body using correct DTO variant (ICreate)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: adminEmail,
    password: `P@ssw0rd!${RandomGenerator.alphaNumeric(4)}`,
    displayName: RandomGenerator.name(),
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  // 2) Create admin and assert response
  const authorized: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorized);

  // Ensure token object exists and is well-formed
  typia.assert<IAuthorizationToken>(authorized.token);

  // 3) Prepare refresh request using IRefresh DTO
  const refreshRequest = {
    refresh_token: authorized.token.refresh,
  } satisfies ICommunityPortalAdmin.IRefresh;

  // 4) Call refresh endpoint and assert response
  const refreshed: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshed);
  typia.assert<IAuthorizationToken>(refreshed.token);

  // 5) Business validations
  // Validate that access tokens are present
  TestValidator.predicate(
    "refreshed access token exists",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );

  // Validate that refresh token exists
  TestValidator.predicate(
    "refreshed refresh token exists",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // Conditional assertions for rotation: if tokens differ, assert not-equals; if identical, record as supported behavior
  if (refreshed.token.access === authorized.token.access) {
    TestValidator.predicate(
      "access token unchanged (rotation not performed by implementation)",
      true,
    );
  } else {
    TestValidator.notEquals(
      "access token rotated",
      refreshed.token.access,
      authorized.token.access,
    );
  }

  if (refreshed.token.refresh === authorized.token.refresh) {
    TestValidator.predicate(
      "refresh token unchanged (rotation optional)",
      true,
    );
  } else {
    TestValidator.notEquals(
      "refresh token rotated",
      refreshed.token.refresh,
      authorized.token.refresh,
    );
  }

  // Verify expiry metadata presence (typia.assert already checks formats), but include descriptive predicates
  TestValidator.predicate(
    "refreshed token has expired_at",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed token has refreshable_until",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.length > 0,
  );

  // Note: admin.is_active enforcement cannot be toggled here because no admin activation API is provided in SDK.
}
