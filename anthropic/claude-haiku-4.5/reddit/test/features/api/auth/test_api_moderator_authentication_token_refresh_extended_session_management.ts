import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_authentication_token_refresh_extended_session_management(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const registrationHref = "https://community.example.com/auth/register";
  const registrationReferrer = "https://community.example.com/";

  const createdModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: registrationHref,
        referrer: registrationReferrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Verify initial tokens are issued
  TestValidator.predicate(
    "initial access token should be issued",
    createdModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should be issued",
    createdModerator.token.refresh.length > 0,
  );

  // Verify access token expiration is set
  const initialExpiration = new Date(createdModerator.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "access token should have future expiration",
    initialExpiration.getTime() > now.getTime(),
  );

  // Verify refresh token has long lifespan
  const refreshableUntil = new Date(createdModerator.token.refreshable_until);
  const refreshTokenLifespanMs = refreshableUntil.getTime() - now.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "refresh token should have lifespan of approximately 7 days or more",
    refreshTokenLifespanMs >= sevenDaysMs * 0.9,
  );

  // Step 2: Simulate Device 1 - First refresh operation
  const device1Connection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  const device1Refresh1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(device1Connection, {
      body: {
        refresh_token: createdModerator.token.refresh,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(device1Refresh1);

  // Verify device 1 received new access token
  TestValidator.predicate(
    "device 1 should receive new access token after refresh",
    device1Refresh1.token.access.length > 0,
  );
  TestValidator.notEquals(
    "device 1 new access token should differ from initial",
    device1Refresh1.token.access,
    createdModerator.token.access,
  );

  // Step 3: Simulate Device 2 - Independent refresh operation
  const device2Connection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  const device2Refresh1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(device2Connection, {
      body: {
        refresh_token: createdModerator.token.refresh,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(device2Refresh1);

  // Verify device 2 received new tokens
  TestValidator.predicate(
    "device 2 should receive new access token after refresh",
    device2Refresh1.token.access.length > 0,
  );

  // Step 4: Verify tokens are independent between devices
  TestValidator.notEquals(
    "device 1 and device 2 access tokens should be different",
    device1Refresh1.token.access,
    device2Refresh1.token.access,
  );

  // Step 5: Verify device 1 can refresh again with its new refresh token
  const device1Connection2: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  const device1Refresh2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(device1Connection2, {
      body: {
        refresh_token: device1Refresh1.token.refresh,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(device1Refresh2);

  // Verify continuity of device 1 sessions
  TestValidator.predicate(
    "device 1 should be able to refresh multiple times",
    device1Refresh2.token.access.length > 0,
  );

  // Step 6: Verify device 1 tokens remain independent from device 2
  TestValidator.notEquals(
    "device 1 second refresh should produce different token from device 2",
    device1Refresh2.token.access,
    device2Refresh1.token.access,
  );

  // Step 7: Verify moderator metadata consistency across sessions
  TestValidator.equals(
    "moderator ID should remain consistent across devices",
    device1Refresh1.id,
    device2Refresh1.id,
  );

  TestValidator.equals(
    "moderator ID should remain consistent after multiple refreshes",
    device1Refresh1.id,
    device1Refresh2.id,
  );

  TestValidator.equals(
    "moderator username should remain consistent across sessions",
    device1Refresh1.username,
    device2Refresh1.username,
  );

  TestValidator.equals(
    "moderator email should remain consistent across sessions",
    device1Refresh1.email,
    device2Refresh1.email,
  );

  // Step 8: Verify access token expiration times are updated with each refresh
  const device1Expiration1 = new Date(device1Refresh1.token.expired_at);
  const device1Expiration2 = new Date(device1Refresh2.token.expired_at);

  TestValidator.predicate(
    "subsequent refresh should provide new expiration timestamp",
    device1Expiration2.getTime() > device1Expiration1.getTime(),
  );

  // Step 9: Verify refresh token refreshable_until remains valid
  const device1Refreshable1 = new Date(device1Refresh1.token.refreshable_until);
  const device1Refreshable2 = new Date(device1Refresh2.token.refreshable_until);

  TestValidator.predicate(
    "refresh token should remain valid for extended period after refresh",
    device1Refreshable1.getTime() > now.getTime(),
  );

  TestValidator.predicate(
    "refresh token expiration should be extended or maintained",
    device1Refreshable2.getTime() >= device1Refreshable1.getTime(),
  );
}
