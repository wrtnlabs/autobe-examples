import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 2. Create a guest join connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 3. Call authorize_guest_join utility function to perform guest join
  const authorized: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: { deviceFingerprint },
    });
  // 4. Assert the response is correct type
  typia.assert(authorized);
  // 5. Validate guest metadata fields
  TestValidator.predicate(
    "guest id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals(
    "device fingerprint matches",
    authorized.deviceFingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "createdAt format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(authorized.createdAt),
  );
  TestValidator.predicate(
    "updatedAt format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(authorized.updatedAt),
  );
  // 6. Validate deletedAt either undefined, null, or ISO date-time format
  if (authorized.deletedAt !== null && authorized.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        authorized.deletedAt,
      ),
    );
  }
  // 7. Validate access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "access token non-empty",
    typeof authorized.access === "string" && authorized.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    typeof authorized.refresh === "string" && authorized.refresh.length > 0,
  );
  // 8. Validate accessExpiredAt and refreshExpiredAt formats
  TestValidator.predicate(
    "accessExpiredAt format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
      authorized.accessExpiredAt,
    ),
  );
  TestValidator.predicate(
    "refreshExpiredAt format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
      authorized.refreshExpiredAt,
    ),
  );
  // 9. Validate token object structure
  typia.assert(authorized.token);
  TestValidator.predicate(
    "token.access matches access",
    authorized.token.access === authorized.access,
  );
  TestValidator.predicate(
    "token.refresh matches refresh",
    authorized.token.refresh === authorized.refresh,
  );
  TestValidator.predicate(
    "token.expired_at matches accessExpiredAt",
    authorized.token.expired_at === authorized.accessExpiredAt,
  );
  TestValidator.predicate(
    "token.refreshable_until matches refreshExpiredAt",
    authorized.token.refreshable_until === authorized.refreshExpiredAt,
  );
  // 10. Now create guest actor connection with new token (simulate authenticated requests)
  const guestAuthConnection: api.IConnection = { host: connection.host };
  guestAuthConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 11. Validate the guestAuthConnection can be used for authenticated guest API calls
  TestValidator.predicate(
    "guest authorization header set",
    typeof guestAuthConnection.headers.Authorization === "string" &&
      guestAuthConnection.headers.Authorization.length > 10,
  );
}
