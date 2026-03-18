import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token rotation security during member authentication refresh operations.
 *
 * This test validates that the refresh endpoint properly implements token rotation:
 * 1. Member account is created via join to obtain initial authentication tokens
 * 2. Refresh endpoint is called multiple times in sequence
 * 3. Each refresh returns new access_token and refresh_token different from previous
 * 4. Session expired_at is extended with each successful refresh
 * 5. Validates security mechanism preventing token reuse while maintaining session continuity
 */
export async function test_api_member_refresh_token_rotation_verification(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account to obtain initial authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial token values for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  // Step 2: First refresh - obtain new tokens
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
        ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IRefresh,
    },
  );
  typia.assert(firstRefreshAuth);
  // Verify first refresh tokens are different from initial tokens (token rotation)
  TestValidator.notEquals(
    "access token rotated on first refresh",
    initialAccessToken,
    firstRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated on first refresh",
    initialRefreshToken,
    firstRefreshAuth.token.refresh,
  );
  // Verify session expired_at is extended after first refresh
  TestValidator.predicate(
    "session extended after first refresh",
    new Date(firstRefreshAuth.token.expired_at).getTime() >
      new Date(initialExpiredAt).getTime(),
  );
  // Store first refresh tokens for second refresh comparison
  const firstRefreshAccessToken = firstRefreshAuth.token.access;
  const firstRefreshRefreshToken = firstRefreshAuth.token.refresh;
  const firstRefreshExpiredAt = firstRefreshAuth.token.expired_at;
  // Step 3: Second refresh - obtain another set of new tokens
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshAuth = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: firstRefreshRefreshToken,
        ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  // Verify second refresh tokens are different from first refresh tokens (continued rotation)
  TestValidator.notEquals(
    "access token rotated on second refresh",
    firstRefreshAccessToken,
    secondRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated on second refresh",
    firstRefreshRefreshToken,
    secondRefreshAuth.token.refresh,
  );
  // Verify session expired_at is further extended after second refresh
  TestValidator.predicate(
    "session extended after second refresh",
    new Date(secondRefreshAuth.token.expired_at).getTime() >
      new Date(firstRefreshExpiredAt).getTime(),
  );
  // Verify member profile remains consistent across all refresh operations
  TestValidator.equals(
    "member id consistent",
    initialAuth.id,
    firstRefreshAuth.id,
  );
  TestValidator.equals(
    "member id consistent after second refresh",
    initialAuth.id,
    secondRefreshAuth.id,
  );
  TestValidator.equals(
    "email consistent",
    initialAuth.email,
    firstRefreshAuth.email,
  );
  TestValidator.equals(
    "email consistent after second refresh",
    initialAuth.email,
    secondRefreshAuth.email,
  );
}
