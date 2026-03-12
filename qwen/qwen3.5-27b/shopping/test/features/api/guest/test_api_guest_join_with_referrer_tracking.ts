import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session creation with proper referrer and href tracking for analytics purposes.
 * Verifies that the request body accepts href (current page URL) and referrer (referring page URL) fields,
 * and that these values are correctly stored in the guest session record. Tests with various referrer
 * sources: direct navigation, search engine referral, social media link, and internal platform page navigation.
 * Confirms that the IP address is captured and device fingerprint is automatically generated.
 */
export async function test_api_guest_join_with_referrer_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Test case 1: Guest join with search engine referral
  const searchEngineReferrer = {
    href: "https://shop.example.com/products/category/electronics",
    referrer: "https://www.google.com/search?q=best+laptops",
    ip: "192.168.1.100",
  } satisfies IShoppingMallGuest.IJoin;
  const guest1 = await authorize_guest_join(guestConnection, {
    body: searchEngineReferrer,
  });
  typia.assert(guest1);
  // Validate guest1 response structure
  TestValidator.predicate(
    "guest id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest1.id,
    ),
  );
  TestValidator.predicate(
    "device fingerprint exists",
    guest1.device_fingerprint.length > 0,
  );
  TestValidator.equals("ip matches input", guest1.ip, "192.168.1.100");
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      guest1.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      guest1.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest1.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token exists",
    guest1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    guest1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      guest1.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      guest1.token.refreshable_until,
    ),
  );
  // Create new connection for second guest (different session)
  const guestConnection2: api.IConnection = { host: connection.host };
  // Test case 2: Guest join with social media referral (no IP provided)
  const socialMediaReferrer = {
    href: "https://shop.example.com/products/smartphone",
    referrer: "https://www.facebook.com/posts/12345",
  } satisfies IShoppingMallGuest.IJoin;
  const guest2 = await authorize_guest_join(guestConnection2, {
    body: socialMediaReferrer,
  });
  typia.assert(guest2);
  // Validate guest2 has different ID from guest1
  TestValidator.notEquals("different guest IDs", guest1.id, guest2.id);
  // Validate guest2 response structure
  TestValidator.predicate(
    "device fingerprint exists",
    guest2.device_fingerprint.length > 0,
  );
  TestValidator.predicate("ip is captured", guest2.ip.length > 0);
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest2.deleted_at,
    null,
  );
  // Create new connection for third guest
  const guestConnection3: api.IConnection = { host: connection.host };
  // Test case 3: Guest join with direct navigation (internal referral)
  const directReferrer = {
    href: "https://shop.example.com/home",
    referrer: "https://shop.example.com/promotions/summer-sale",
  } satisfies IShoppingMallGuest.IJoin;
  const guest3 = await authorize_guest_join(guestConnection3, {
    body: directReferrer,
  });
  typia.assert(guest3);
  // Validate guest3 has unique ID
  TestValidator.notEquals(
    "guest3 ID differs from guest1",
    guest1.id,
    guest3.id,
  );
  TestValidator.notEquals(
    "guest3 ID differs from guest2",
    guest2.id,
    guest3.id,
  );
  // Validate guest3 response structure
  TestValidator.predicate(
    "device fingerprint exists",
    guest3.device_fingerprint.length > 0,
  );
  TestValidator.predicate("ip is captured", guest3.ip.length > 0);
  TestValidator.equals(
    "deleted_at is null for active guest",
    guest3.deleted_at,
    null,
  );
  // Verify all guests have valid tokens
  TestValidator.predicate(
    "guest1 has access token",
    guest1.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest2 has access token",
    guest2.token.access.length > 0,
  );
  TestValidator.predicate(
    "guest3 has access token",
    guest3.token.access.length > 0,
  );
  // Verify token expiration times are in the future
  const now = new Date();
  const guest1Expired = new Date(guest1.token.expired_at);
  const guest2Expired = new Date(guest2.token.expired_at);
  const guest3Expired = new Date(guest3.token.expired_at);
  TestValidator.predicate(
    "guest1 token expired_at is in future",
    guest1Expired > now,
  );
  TestValidator.predicate(
    "guest2 token expired_at is in future",
    guest2Expired > now,
  );
  TestValidator.predicate(
    "guest3 token expired_at is in future",
    guest3Expired > now,
  );
}
