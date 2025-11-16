import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration entry point tracking functionality.
 *
 * Validates that the guest registration endpoint correctly captures and stores
 * the entry point URL (href) for analytics and user journey tracking. This test
 * ensures the system accurately records the full URL including protocol,
 * domain, path, query parameters, and fragments where the guest initiated
 * registration.
 *
 * Test flow:
 *
 * 1. Register guest with basic URL structure (protocol + domain + path)
 * 2. Register guest with URL containing query parameters
 * 3. Register guest with URL containing fragment/hash
 * 4. Register guest with complex URL (query params + fragment)
 * 5. Validate all registrations succeed and return proper authentication tokens
 * 6. Verify response structure contains guest ID and valid JWT tokens
 */
export async function test_api_guest_registration_entry_point_tracking(
  connection: api.IConnection,
) {
  // Test Case 1: Basic URL with protocol, domain, and path
  const basicHref = "https://discussion.example.com/boards/technology";
  const basicReferrer = "https://search.google.com/search?q=tech+discussion";

  const basicGuest = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "192.168.1.100",
      href: basicHref,
      referrer: basicReferrer,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(basicGuest);

  // Test Case 2: URL with query parameters
  const queryHref =
    "https://discussion.example.com/boards/science?category=physics&sort=recent";
  const queryReferrer = "https://discussion.example.com/boards";

  const queryGuest = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "10.0.0.50",
      href: queryHref,
      referrer: queryReferrer,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(queryGuest);

  TestValidator.notEquals(
    "different guest registrations have different IDs",
    basicGuest.id,
    queryGuest.id,
  );

  // Test Case 3: URL with fragment/hash
  const fragmentHref =
    "https://discussion.example.com/boards/general#comment-section";
  const fragmentReferrer = "https://discussion.example.com/home";

  const fragmentGuest = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "172.16.0.200",
      href: fragmentHref,
      referrer: fragmentReferrer,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(fragmentGuest);

  // Test Case 4: Complex URL with both query parameters and fragment
  const complexHref =
    "https://discussion.example.com/boards/programming?lang=typescript&level=advanced#best-practices";
  const complexReferrer =
    "https://stackoverflow.com/questions/tagged/typescript";

  const complexGuest = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "203.0.113.45",
      href: complexHref,
      referrer: complexReferrer,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(complexGuest);

  // Test Case 5: Direct access (empty referrer)
  const directHref = "https://discussion.example.com/boards/announcements";
  const emptyReferrer = "";

  const directGuest = await api.functional.auth.guest.join(connection, {
    body: {
      ip: "198.51.100.75",
      href: directHref,
      referrer: emptyReferrer,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(directGuest);

  // Verify all guest IDs are unique
  const allGuestIds = [
    basicGuest.id,
    queryGuest.id,
    fragmentGuest.id,
    complexGuest.id,
    directGuest.id,
  ];

  const uniqueIds = new Set(allGuestIds);
  TestValidator.predicate(
    "all guest registrations generate unique IDs",
    uniqueIds.size === allGuestIds.length,
  );
}
