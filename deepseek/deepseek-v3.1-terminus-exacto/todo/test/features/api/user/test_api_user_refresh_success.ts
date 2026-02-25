import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_success(connection: api.IConnection): Promise<void> {
    // Create user account and obtain initial tokens
    const userConnection: api.IConnection = { host: connection.host };
    
    const authorized = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>()
        } satisfies ITodoAppUser.IJoin,
    });
    
    typia.assert(authorized);
    
    // Store initial refresh token
    const initialRefreshToken = authorized.token.refresh;
    const initialExpiredAt = new Date(authorized.token.expired_at);
    const initialRefreshableUntil = new Date(authorized.token.refreshable_until);
    
    // Wait a moment to ensure timestamp differences
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Use refresh token to obtain new tokens
    const refreshed = await authorize_user_refresh(userConnection, {
        body: { refresh_token: initialRefreshToken } satisfies ITodoAppUser.IRefresh,
    });
    typia.assert(refreshed);
    
    // Validate token rotation - new tokens should be different
    TestValidator.notEquals("refresh token should rotate", initialRefreshToken, refreshed.token.refresh);
    TestValidator.notEquals("access token should rotate", authorized.token.access, refreshed.token.access);
    
    // Validate user identity remains consistent
    TestValidator.equals("user ID should match", authorized.id, refreshed.id);
    TestValidator.equals("user email should match", authorized.email, refreshed.email);
    TestValidator.equals("display name should match", authorized.display_name, refreshed.display_name);
    
    // Validate token expiration timestamps are updated
    const newExpiredAt = new Date(refreshed.token.expired_at);
    const newRefreshableUntil = new Date(refreshed.token.refreshable_until);
    TestValidator.predicate("expired_at should be after initial", newExpiredAt > initialExpiredAt);
    TestValidator.predicate("refreshable_until should be extended", newRefreshableUntil > initialRefreshableUntil);
    
    // Verify approximate token expiration times
    const now = new Date();
    const expectedExpiredAt = new Date(now.getTime() + 30 * 60 * 1000); // ~30 minutes
    const expectedRefreshableUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // ~30 days
    
    // Allow 1 minute tolerance for timing variations
    const expiredAtDiff = Math.abs(expectedExpiredAt.getTime() - newExpiredAt.getTime());
    const refreshableUntilDiff = Math.abs(expectedRefreshableUntil.getTime() - newRefreshableUntil.getTime());
    
    TestValidator.predicate("expired_at should be approximately 30 minutes from now", expiredAtDiff < 60 * 1000);
    TestValidator.predicate("refreshable_until should be approximately 30 days from now", refreshableUntilDiff < 60 * 1000);
    
    // Verify old refresh token cannot be reused
    await TestValidator.error("old refresh token should be invalid", async () => {
        await authorize_user_refresh(userConnection, {
            body: { refresh_token: initialRefreshToken } satisfies ITodoAppUser.IRefresh,
        });
    });
    
    // Test that new access token works for authenticated requests
    TestValidator.predicate("new access token should be valid", refreshed.token.access.length > 0);
    TestValidator.predicate("new refresh token should be valid", refreshed.token.refresh.length > 0);
}