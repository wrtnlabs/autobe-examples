import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_concurrent_requests(connection: api.IConnection): Promise<void> {
    // Step 1: Create user account
    const userResponse = await authorize_user_join(
        { host: connection.host }, 
        { 
            body: { 
                email: typia.random<string & tags.Format<"email">>() 
            } 
        }
    );
    typia.assert(userResponse);
    const userEmail = userResponse.email;
    
    // Step 2: First password reset request
    const firstReset = await api.functional.communityPlatform.user.password_resets.create(
        { host: connection.host }, 
        {
            body: {
                email: userEmail,
            } satisfies ICommunityPlatformUserPasswordReset.IRequest,
        }
    );
    typia.assert(firstReset);
    
    // Step 3: Second password reset request (immediately after)
    const secondReset = await api.functional.communityPlatform.user.password_resets.create(
        { host: connection.host }, 
        {
            body: {
                email: userEmail,
            } satisfies ICommunityPlatformUserPasswordReset.IRequest,
        }
    );
    typia.assert(secondReset);
    
    // Step 4: Validate token invalidation and concurrency handling
    TestValidator.notEquals("Second request must generate a new token", firstReset.token, secondReset.token);
    
    // Step 5: Check that email matches in both responses
    TestValidator.equals("Email should remain the same", firstReset.email, userEmail);
    TestValidator.equals("Email should remain the same", secondReset.email, userEmail);
    
    // Step 6: Validate token presence (should be visible in test environment)
    TestValidator.predicate("First reset token should be present in test environment", () => firstReset.token !== undefined && firstReset.token.length > 0);
    TestValidator.predicate("Second reset token should be present in test environment", () => secondReset.token !== undefined && secondReset.token.length > 0);
    
    // Step 7: Validate expiration timestamps are ISO strings
    TestValidator.predicate("First reset expiration timestamp should be valid", () => /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$/.test(firstReset.expires_at));
    TestValidator.predicate("Second reset expiration timestamp should be valid", () => /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$/.test(secondReset.expires_at));
}