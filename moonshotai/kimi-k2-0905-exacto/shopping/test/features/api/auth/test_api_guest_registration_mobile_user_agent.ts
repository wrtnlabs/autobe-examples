import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest registration with mobile device user agent strings.
 *
 * This test validates that the guest registration endpoint properly handles
 * mobile device user agent strings from various iPhone and Android devices. It
 * ensures that mobile users can successfully create anonymous guest sessions
 * and that the system correctly captures device information for analytics,
 * compatibility verification, and session management.
 *
 * Test Steps:
 *
 * 1. Test iPhone device registration with Safari user agent
 * 2. Test Android device registration with Chrome user agent
 * 3. Test iPad device registration with mobile Safari user agent
 * 4. Test Android tablet device registration
 * 5. Validate that all mobile devices receive proper guest session tokens
 * 6. Verify device characteristics are captured in response
 * 7. Test that Authorization header is automatically set after registration
 *
 * The test uses realistic mobile browser user agents to ensure the system can
 * properly identify and process mobile device sessions, which is critical for
 * providing optimized experiences to mobile shoppers in the e-commerce shopping
 * mall platform.
 */
export async function test_api_guest_registration_mobile_user_agent(
  connection: api.IConnection,
) {
  // Test iPhone Safari user agent
  const iphoneRequestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const iphoneGuest = await api.functional.auth.guest.join(connection, {
    body: iphoneRequestBody,
  });

  typia.assert(iphoneGuest);

  TestValidator.predicate(
    "iPhone guest has valid ID",
    typia.is<string & tags.Format<"uuid">>(iphoneGuest.id),
  );

  TestValidator.predicate(
    "iPhone guest has valid session ID",
    typia.is<string & tags.MinLength<10> & tags.MaxLength<64>>(
      iphoneGuest.session_id,
    ),
  );

  TestValidator.predicate(
    "iPhone user agent matches request",
    iphoneGuest.user_agent === iphoneRequestBody.user_agent,
  );

  TestValidator.predicate(
    "iPhone guest has IP address",
    typia.is<string & tags.Format<"ipv4">>(iphoneGuest.ip_address),
  );

  TestValidator.predicate(
    "iPhone guest has valid authorization token",
    typia.is<IAuthorizationToken>(iphoneGuest.token),
  );

  // Test Android Chrome user agent
  const androidRequestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const androidGuest = await api.functional.auth.guest.join(connection, {
    body: androidRequestBody,
  });

  typia.assert(androidGuest);

  TestValidator.predicate(
    "Android guest has different session ID than iPhone guest",
    iphoneGuest.session_id !== androidGuest.session_id,
  );

  TestValidator.predicate(
    "Android user agent matches request",
    androidGuest.user_agent === androidRequestBody.user_agent,
  );

  // Test iPad user agent
  const ipadRequestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const ipadGuest = await api.functional.auth.guest.join(connection, {
    body: ipadRequestBody,
  });

  typia.assert(ipadGuest);

  TestValidator.predicate(
    "iPad guest has unique session ID",
    ![iphoneGuest.session_id, androidGuest.session_id].includes(
      ipadGuest.session_id,
    ),
  );

  // Test Android tablet user agent
  const androidTabletRequestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Safari/537.36",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const androidTabletGuest = await api.functional.auth.guest.join(connection, {
    body: androidTabletRequestBody,
  });

  typia.assert(androidTabletGuest);

  TestValidator.predicate(
    "Android tablet guest has different session ID",
    ![
      iphoneGuest.session_id,
      androidGuest.session_id,
      ipadGuest.session_id,
    ].includes(androidTabletGuest.session_id),
  );

  // Test that Authorization header is automatically set after successful registration
  TestValidator.predicate(
    "Connection has Authorization header after first registration",
    connection.headers?.Authorization !== undefined &&
      connection.headers.Authorization === iphoneGuest.token.access,
  );

  // Test with custom mobile app user agent
  const customAppRequestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent: "ShoppingApp/2.1.0 (iOS; iPhone13,2; iOS 15.0; Scale/3.00)",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const customAppGuest = await api.functional.auth.guest.join(connection, {
    body: customAppRequestBody,
  });

  typia.assert(customAppGuest);

  TestValidator.predicate(
    "Custom app user agent captured correctly",
    customAppGuest.user_agent === customAppRequestBody.user_agent,
  );

  // Test with mobile Samsung browser user agent
  const samsungRequestBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent:
      "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/15.0 Chrome/95.0.4638.74 Mobile Safari/537.36",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const samsungGuest = await api.functional.auth.guest.join(connection, {
    body: samsungRequestBody,
  });

  typia.assert(samsungGuest);

  TestValidator.predicate(
    "Samsung browser user agent captured correctly",
    samsungGuest.user_agent === samsungRequestBody.user_agent,
  );
}
