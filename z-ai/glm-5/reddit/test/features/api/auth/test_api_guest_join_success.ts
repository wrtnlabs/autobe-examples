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

/**
 * Test successful guest account creation.
 *
 * This test validates that unauthenticated visitors can create temporary
 * guest accounts to browse the community platform without providing credentials.
 */
export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid request body for guest join
  const body = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  // Call guest join API
  const response = await api.functional.communityPlatform.auth.guest.join(
    guestConnection,
    { body },
  );
  // Validate response structure
  typia.assert(response);
  // Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(response.token.expired_at);
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token should outlive access token",
    refreshableUntil > expiredAt,
  );
  // Validate that connection was updated with access token
  TestValidator.predicate(
    "connection should have authorization header",
    guestConnection.headers?.Authorization === response.token.access,
  );
}
