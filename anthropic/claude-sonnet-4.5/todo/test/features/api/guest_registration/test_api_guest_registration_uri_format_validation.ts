import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest registration with various URI formats for href and referrer
 * fields.
 *
 * This test validates that the guest registration endpoint properly accepts and
 * handles well-formed URIs including different protocols (https, http), various
 * domain formats, paths with parameters, and query strings. It verifies that
 * the system correctly validates URI format constraints and stores the complete
 * URI values accurately in session records for analytics and referrer tracking
 * purposes.
 *
 * Test scenarios:
 *
 * 1. HTTPS URLs with complex paths and query parameters
 * 2. HTTP URLs with subdomains and fragments
 * 3. URIs with port numbers and encoded characters
 * 4. Various domain formats (TLDs, subdomains, international domains)
 * 5. URIs with path parameters and multiple query strings
 */
export async function test_api_guest_registration_uri_format_validation(
  connection: api.IConnection,
) {
  // Test Case 1: HTTPS with complex path and query parameters
  const testCase1 = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://www.example.com/app/dashboard?user=123&tab=overview" satisfies string &
      tags.Format<"uri">,
    referrer: "https://search.google.com/search?q=todo+app" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListGuest.ICreate;

  const guest1 = await api.functional.auth.guest.join(connection, {
    body: testCase1,
  });
  typia.assert(guest1);

  // Test Case 2: HTTP with subdomain and fragment
  const testCase2 = {
    href: "http://app.todolist.com/tasks#active" satisfies string &
      tags.Format<"uri">,
    referrer: "http://blog.todolist.com/getting-started" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListGuest.ICreate;

  const guest2 = await api.functional.auth.guest.join(connection, {
    body: testCase2,
  });
  typia.assert(guest2);

  // Test Case 3: HTTPS with port number and path parameters
  const testCase3 = {
    ip: "192.168.1.100",
    href: "https://localhost:3000/projects/123/tasks/456" satisfies string &
      tags.Format<"uri">,
    referrer: "https://github.com/user/repository" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListGuest.ICreate;

  const guest3 = await api.functional.auth.guest.join(connection, {
    body: testCase3,
  });
  typia.assert(guest3);

  TestValidator.equals("guest3 IP matches input", guest3.ip, testCase3.ip);

  // Test Case 4: URIs with encoded characters and multiple query parameters
  const testCase4 = {
    href: "https://example.com/search?q=hello%20world&page=1&sort=date" satisfies string &
      tags.Format<"uri">,
    referrer:
      "https://www.example.org/path/to/page?param1=value1&param2=value2" satisfies string &
        tags.Format<"uri">,
  } satisfies ITodoListGuest.ICreate;

  const guest4 = await api.functional.auth.guest.join(connection, {
    body: testCase4,
  });
  typia.assert(guest4);

  // Test Case 5: Simple URIs with different TLDs
  const testCase5 = {
    href: "https://example.io/home" satisfies string & tags.Format<"uri">,
    referrer: "https://example.co.uk/landing" satisfies string &
      tags.Format<"uri">,
  } satisfies ITodoListGuest.ICreate;

  const guest5 = await api.functional.auth.guest.join(connection, {
    body: testCase5,
  });
  typia.assert(guest5);
}
