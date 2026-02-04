import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection with empty headers for anonymous access
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the guest join endpoint to create an ephemeral session
  const authResult: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {} satisfies ICommunityPlatformGuest.IJoin,
    });
  // Validate response structure and types with typia.assert
  typia.assert(authResult);
  // Validate token structure
  typia.assert(authResult.token);
  // Validate access token exists and is non-empty string with null safety
  TestValidator.predicate(
    "access token is non-empty string",
    authResult.token.access !== undefined &&
      typeof authResult.token.access === "string" &&
      authResult.token.access.length > 0,
  );
  // Validate refresh token exists and is non-empty string with null safety
  TestValidator.predicate(
    "refresh token is non-empty string",
    authResult.token.refresh !== undefined &&
      typeof authResult.token.refresh === "string" &&
      authResult.token.refresh.length > 0,
  );
  // Validate session expiration is after token expiration (logical constraint)
  const sessionExpirationDate = new Date(authResult.sessionExpiration);
  const tokenExpiredAt = new Date(authResult.token.expired_at);
  TestValidator.predicate(
    "session expiration is after token expiration",
    sessionExpirationDate > tokenExpiredAt,
  );
}
