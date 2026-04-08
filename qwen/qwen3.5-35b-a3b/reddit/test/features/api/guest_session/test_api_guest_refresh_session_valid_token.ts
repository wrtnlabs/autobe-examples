import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
/**
 * Test successful guest session refresh using a valid refresh token from an
 * existing guest session.
 *
 * Validates the complete guest session refresh flow by first creating a guest
 * session and then refreshing it with a valid refresh token. Verifies that new
 * tokens are issued and that session timestamps are correctly updated with
 * extended expiration times. Ensures the system properly validates refresh
 * tokens against the database, issues new JWT tokens with refreshed expiration
 * times, and maintains session continuity.
 *
 * 1. Guest session creation via POST /redditPlatform/auth/guest/join
 * 2. Refresh token capture from initial session response
 * 3. Session refresh using POST /redditPlatform/auth/guest/refresh with valid token
 * 4. Token and timestamp validation to ensure proper renewal
 */
export async function test_api_guest_refresh_session_valid_token(connection: api.IConnection): Promise<void> {
    // 1. Create guest session
    const guestConnection: api.IConnection = { host: connection.host };
    const originalSession = await authorize_guest_join(guestConnection, {
        body: {
            fingerprint: typia.random<string>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformGuest.IJoin,
    });
    typia.assert(originalSession);
    const originalAccessToken = originalSession.token.access;
    const originalRefreshToken = originalSession.token.refresh;
    const originalExpiredAt = originalSession.token.expired_at;
    const originalRefreshableUntil = originalSession.token.refreshable_until;
    // 2. Refresh the session with the valid refresh token
    const refreshedSession = await authorize_guest_refresh(guestConnection, {
        body: {
            refresh_token: originalRefreshToken,
        } satisfies IRedditPlatformGuest.IRefresh,
    });
    typia.assert(refreshedSession);
    // 3. Verify new tokens differ from original tokens
    TestValidator.notEquals("access token refreshed", originalAccessToken, refreshedSession.token.access);
    TestValidator.notEquals("refresh token refreshed", originalRefreshToken, refreshedSession.token.refresh);
    // 4. Verify timestamps are extended
    TestValidator.notEquals("expired_at extended", originalExpiredAt, refreshedSession.token.expired_at);
    TestValidator.notEquals("refreshable_until extended", originalRefreshableUntil, refreshedSession.token.refreshable_until);
    // 5. Verify expiration timestamps are in the future relative to original
    TestValidator.predicate("expired_at extended", refreshedSession.token.expired_at > originalExpiredAt);
    TestValidator.predicate("refreshable_until extended", refreshedSession.token.refreshable_until > originalRefreshableUntil);
    // 6. Verify expired_at is within refreshable_until (valid token relationship)
    TestValidator.predicate("expired_at within refreshable_until", refreshedSession.token.expired_at < refreshedSession.token.refreshable_until);
}
// 7. Define utility functions inline since they're not imported
async function authorize_guest_join(connection: api.IConnection, props: {
    body?: DeepPartial<IRedditPlatformGuest.IJoin>;
}): Promise<IRedditPlatformGuest.IAuthorized> {
    const joinInput = {
        fingerprint: props.body?.fingerprint ?? typia.random<string>(),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin;
    return await api.functional.redditPlatform.auth.guest.join(connection, {
        body: joinInput,
    });
}
async function authorize_guest_refresh(connection: api.IConnection, props: {
    body: IRedditPlatformGuest.IRefresh;
}): Promise<IRedditPlatformGuest.IAuthorized> {
    return await api.functional.redditPlatform.auth.guest.refresh(connection, {
        body: props.body,
    });
}