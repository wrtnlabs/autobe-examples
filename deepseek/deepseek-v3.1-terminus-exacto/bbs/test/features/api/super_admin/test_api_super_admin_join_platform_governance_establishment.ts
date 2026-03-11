import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the foundational establishment of platform governance through super admin registration.
 * Validates super administrator registration with immediate privilege elevation, token issuance,
 * and email uniqueness enforcement at business logic level.
 */
export async function test_api_super_admin_join_platform_governance_establishment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Generate unique registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 3. Register first super administrator using utility function
  const firstRegistration = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(firstRegistration);
  // 4. Validate super administrator identity and privileges
  TestValidator.equals(
    "admin_grade should be 'super'",
    firstRegistration.admin_grade,
    "super",
  );
  TestValidator.equals("email matches input", firstRegistration.email, email);
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(firstRegistration.id),
  );
  TestValidator.predicate("created_at is valid ISO string", () => {
    const date = new Date(firstRegistration.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO string", () => {
    const date = new Date(firstRegistration.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at should be null",
    firstRegistration.deleted_at,
    null,
  );
  // 5. Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    firstRegistration.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    firstRegistration.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is future timestamp", () => {
    const expiredAt = new Date(firstRegistration.token.expired_at);
    return !isNaN(expiredAt.getTime()) && expiredAt > new Date();
  });
  TestValidator.predicate("refreshable_until is future timestamp", () => {
    const refreshableUntil = new Date(
      firstRegistration.token.refreshable_until,
    );
    return !isNaN(refreshableUntil.getTime()) && refreshableUntil > new Date();
  });
  // 6. Test email uniqueness enforcement (business logic error, not validation error)
  await TestValidator.error("duplicate email should be rejected", async () => {
    // Create new connection to avoid token conflicts
    const duplicateConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(duplicateConnection, {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
  });
  // 7. Verify token is automatically set in connection headers by utility function
  TestValidator.predicate(
    "connection headers should have authorization token",
    superAdminConnection.headers?.Authorization !== undefined &&
      (typeof superAdminConnection.headers.Authorization === "string" &&
        superAdminConnection.headers.Authorization.includes("Bearer") ||
        superAdminConnection.headers.Authorization?.toString().includes("Bearer")),
  );
}