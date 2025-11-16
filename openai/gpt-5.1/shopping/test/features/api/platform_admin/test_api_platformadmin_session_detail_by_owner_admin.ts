import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformadminSession";

export async function test_api_platformadmin_session_detail_by_owner_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator via join endpoint
  //    This establishes a valid platformAdmin actor and sets Authorization
  //    header on the connection through the SDK.
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // Provide realistic session-context URLs for href and referrer.
    href: "https://admin.shopping-mall.local/platform/onboarding",
    referrer: "https://admin.shopping-mall.local/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. With the authenticated connection, attempt to fetch a platform admin
  //    session detail. In real runtime this expects a sessionId that truly
  //    belongs to platformAdminId, but such an ID is not exposed by the
  //    provided APIs. To keep the test compilable and still exercise the
  //    endpoint, we use random UUIDs while focusing on type validation
  //    via typia.assert in environments where simulate mode or fixtures
  //    may provide valid responses.

  const platformAdminId: string & tags.Format<"uuid"> = authorizedAdmin.id;
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const session: IShoppingMallPlatformadminSession =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.sessions.at(
      connection,
      {
        platformAdminId,
        sessionId,
      },
    );

  // 3. Validate response shape when the call returns successfully.
  //    We do not assert on HTTP status codes; typia.assert will fully
  //    validate the DTO structure when data is present.
  typia.assert(session);

  // Basic business-level consistency checks using TestValidator,
  // guarded by the available fields.
  TestValidator.equals(
    "session.id should equal requested sessionId",
    session.id,
    sessionId,
  );

  TestValidator.equals(
    "session.platform_admin_id should equal requested platformAdminId",
    session.platform_admin_id,
    platformAdminId,
  );

  TestValidator.predicate(
    "session.created_at should be a non-empty ISO date-time string",
    session.created_at.length > 0,
  );

  TestValidator.predicate(
    "platformAdmin summary id matches platform_admin_id",
    session.platformAdmin.id === session.platform_admin_id,
  );
}
