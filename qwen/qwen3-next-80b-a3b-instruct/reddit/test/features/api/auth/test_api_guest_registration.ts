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
export async function test_api_guest_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest registration (isolation pattern)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random valid email and password for guest registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Call the guest registration endpoint using the authorization utility function
  const result: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email,
        password,
      },
    });
  // Validate the entire response structure with typia.assert (complete validation)
  typia.assert(result);
  // Validate logical business requirements using TestValidator (no type validation)
  TestValidator.equals(
    "guest type is anonymous",
    result.guestType,
    "anonymous",
  );
  TestValidator.equals("guest is not expired", result.isExpired, false);
  // Validate authorization token structure
  TestValidator.equals(
    "access token exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.notEquals(
    "access and refresh tokens are different",
    result.token.access,
    result.token.refresh,
  );
  // Validate that token expiration timestamps are not in the past
  const now = new Date().getTime();
  TestValidator.predicate("access token not expired yet", () => {
    return new Date(result.token.expired_at).getTime() > now;
  });
  TestValidator.predicate("refresh token still refreshable", () => {
    return new Date(result.token.refreshable_until).getTime() > now;
  });
}
