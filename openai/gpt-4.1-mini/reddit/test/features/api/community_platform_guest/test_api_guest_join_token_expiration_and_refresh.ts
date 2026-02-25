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

export async function test_api_guest_join_token_expiration_and_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a base guest connection
  const guestBaseConnection: api.IConnection = { host: connection.host };
  // Attempt join without deviceFingerprint (should be rejected by validation)
  await TestValidator.error(
    "join failure missing deviceFingerprint",
    async () => {
      await api.functional.communityPlatform.auth.guest.join(
        guestBaseConnection,
        {
          body: {} as any,
        },
      );
    },
  );
  // Attempt join with malformed deviceFingerprint (empty and whitespace)
  await TestValidator.error(
    "join failure with empty deviceFingerprint",
    async () => {
      await api.functional.communityPlatform.auth.guest.join(
        guestBaseConnection,
        {
          body: {
            deviceFingerprint: "",
          } satisfies ICommunityPlatformGuest.IJoin,
        },
      );
    },
  );
  await TestValidator.error(
    "join failure with whitespace deviceFingerprint",
    async () => {
      await api.functional.communityPlatform.auth.guest.join(
        guestBaseConnection,
        {
          body: {
            deviceFingerprint: "  ",
          } satisfies ICommunityPlatformGuest.IJoin,
        },
      );
    },
  );
  // 2. Successful join with a valid deviceFingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const guestAuthorized = await authorize_guest_join(guestBaseConnection, {
    body: { deviceFingerprint },
  });
  typia.assert(guestAuthorized);
  typia.assert(guestAuthorized.token);
  // Validate token structure and timestamps
  TestValidator.predicate(
    "access token present",
    typeof guestAuthorized.access === "string" &&
      guestAuthorized.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof guestAuthorized.refresh === "string" &&
      guestAuthorized.refresh.length > 0,
  );
  // accessExpiredAt is ISO string and earlier than refreshExpiredAt
  const accessExpiredAt = new Date(guestAuthorized.accessExpiredAt);
  const refreshExpiredAt = new Date(guestAuthorized.refreshExpiredAt);
  TestValidator.predicate(
    "access token expires before refresh token",
    accessExpiredAt.getTime() < refreshExpiredAt.getTime(),
  );
  // 3. Use refresh token to obtain new tokens
  const refreshed = await authorize_guest_refresh(guestBaseConnection, {
    body: {
      refreshToken: guestAuthorized.refresh,
    },
  });
  typia.assert(refreshed);
  typia.assert(refreshed.token);
  // Validate refreshed tokens
  TestValidator.predicate(
    "new access token differs",
    refreshed.access !== guestAuthorized.access,
  );
  TestValidator.predicate(
    "new refresh token differs",
    refreshed.refresh !== guestAuthorized.refresh,
  );
  const newAccessExpiredAt = new Date(refreshed.accessExpiredAt);
  const newRefreshExpiredAt = new Date(refreshed.refreshExpiredAt);
  TestValidator.predicate(
    "refresh token expires later than new access token",
    newAccessExpiredAt.getTime() < newRefreshExpiredAt.getTime(),
  );
  // 4. Attempt join with null and undefined deviceFingerprint to verify rejection
  await TestValidator.error(
    "join failure with null deviceFingerprint",
    async () => {
      await api.functional.communityPlatform.auth.guest.join(
        guestBaseConnection,
        {
          body: {
            deviceFingerprint: null as any,
          } satisfies ICommunityPlatformGuest.IJoin,
        },
      );
    },
  );
  await TestValidator.error(
    "join failure with undefined deviceFingerprint",
    async () => {
      await api.functional.communityPlatform.auth.guest.join(
        guestBaseConnection,
        {
          body: {
            deviceFingerprint: undefined as any,
          } satisfies ICommunityPlatformGuest.IJoin,
        },
      );
    },
  );
}
