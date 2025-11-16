import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";
import type { IShoppingMallSecurityEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEventMetadata";
import type { IShoppingMallSecurityEventMetadataValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEventMetadataValue";

/**
 * Validate not-found handling when fetching a security event by ID.
 *
 * Business intent:
 *
 * - Ensure that even a fully authenticated platform administrator cannot retrieve
 *   a security event record when providing a non-existent securityEventId.
 * - Confirm that the system responds with an error instead of returning any
 *   IShoppingMallSecurityEvent payload for such bogus identifiers, upholding
 *   security and information-disclosure expectations.
 *
 * Test flow:
 *
 * 1. Join as a new platform admin using /auth/platformAdmin/join to obtain an
 *    authorized session and token; rely on the SDK to bind the token to the
 *    connection.
 * 2. Generate a random UUID-formatted securityEventId that is extremely unlikely
 *    to match an existing record.
 * 3. Call GET /shoppingMall/platformAdmin/securityEvents/{securityEventId} using
 *    api.functional.shoppingMall.platformAdmin.securityEvents.at.
 * 4. Use TestValidator.error to assert that the call fails (throws an error)
 *    instead of returning an IShoppingMallSecurityEvent.
 *
 * Notes:
 *
 * - We deliberately do not assert a specific HTTP status code to comply with the
 *   testing guidelines against status-code-specific checks.
 * - We also do not attempt to inspect any error body shape; the goal is only to
 *   ensure that non-existent IDs do not yield successful
 *   IShoppingMallSecurityEvent responses.
 */
export async function test_api_security_event_get_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "StrongP@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate a random UUID that will be used as a bogus securityEventId
  const nonexistentSecurityEventId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to fetch the security event and assert that it fails
  await TestValidator.error(
    "non-existent securityEventId should result in an error and not return a security event",
    async () => {
      const result =
        await api.functional.shoppingMall.platformAdmin.securityEvents.at(
          connection,
          {
            securityEventId: nonexistentSecurityEventId,
          },
        );

      // If somehow the call succeeds, assert to ensure the type is correct,
      // then explicitly fail the test because success is not expected.
      typia.assert<IShoppingMallSecurityEvent>(result);
      TestValidator.predicate(
        "security event fetch for non-existent ID must not succeed",
        false,
      );
    },
  );
}
