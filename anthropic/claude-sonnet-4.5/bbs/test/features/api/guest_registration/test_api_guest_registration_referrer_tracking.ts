import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration with referrer tracking for traffic source analysis.
 *
 * This test validates that the guest registration endpoint correctly captures
 * and stores referrer information from various sources. The system must track
 * where guests came from (search engines, social media, external sites,
 * internal navigation, or direct access) to enable traffic source analysis and
 * understand user acquisition channels.
 *
 * Test scenarios:
 *
 * 1. Registration with search engine referrer (Google search)
 * 2. Registration with social media referrer (Twitter/X)
 * 3. Registration with external website referrer
 * 4. Registration with internal page navigation referrer
 * 5. Registration with empty referrer (direct access)
 *
 * Each scenario verifies that the registration succeeds and returns valid
 * authentication tokens with proper guest session information.
 */
export async function test_api_guest_registration_referrer_tracking(
  connection: api.IConnection,
) {
  // Test 1: Guest registration with search engine referrer (Google)
  const googleReferrer = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "203.0.113.42",
      href: "https://example.com/articles/getting-started" satisfies string &
        tags.Format<"uri">,
      referrer:
        "https://www.google.com/search?q=discussion+board" satisfies string &
          tags.Format<"uri">,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(googleReferrer);

  // Test 2: Guest registration with social media referrer (Twitter/X)
  const socialReferrer = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "198.51.100.88",
      href: "https://example.com/topics/technology" satisfies string &
        tags.Format<"uri">,
      referrer: "https://twitter.com/share?url=example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(socialReferrer);

  // Test 3: Guest registration with external website referrer
  const externalReferrer = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "192.0.2.150",
      href: "https://example.com/discussions/latest" satisfies string &
        tags.Format<"uri">,
      referrer: "https://news.ycombinator.com/item?id=123456" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(externalReferrer);

  // Test 4: Guest registration with internal page navigation referrer
  const internalReferrer = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "203.0.113.200",
      href: "https://example.com/categories/programming" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(internalReferrer);

  // Test 5: Guest registration with empty referrer (direct access)
  const directAccess = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "198.51.100.25",
      href: "https://example.com/welcome" satisfies string & tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(directAccess);

  // Verify all registrations produced unique guest IDs
  const allGuestIds = [
    googleReferrer.id,
    socialReferrer.id,
    externalReferrer.id,
    internalReferrer.id,
    directAccess.id,
  ];
  const uniqueIds = new Set(allGuestIds);
  TestValidator.equals(
    "all guest registrations produce unique IDs",
    uniqueIds.size,
    allGuestIds.length,
  );
}
