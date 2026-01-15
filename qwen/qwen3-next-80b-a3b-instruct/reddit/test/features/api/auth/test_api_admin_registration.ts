import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid registration data using typia.random for type-safe test data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Step 3: Execute admin registration using the utility function (priority over SDK)
  const registrationResult: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: registrationData });
  typia.assert(registrationResult);
  // Step 4: Validate token structure and properties
  TestValidator.equals(
    "access token exists",
    registrationResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    registrationResult.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate("access token expired_at is date-time format", () => {
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      registrationResult.token.expired_at,
    );
  });
  TestValidator.predicate(
    "refresh token refreshable_until is date-time format",
    () => {
      return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        registrationResult.token.refreshable_until,
      );
    },
  );
  // Step 5: Verify duplicate registration fails with error (business logic validation, not type error)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_admin_join(adminConnection, { body: registrationData });
    },
  );
}
