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
export async function test_api_user_token_refresh(connection: api.IConnection): Promise<void> {
    // Step 1: Authenticate user to obtain initial tokens using authorization utility
    const newUserConnection: api.IConnection = { host: connection.host };
    const initialAuthResponse: ITodoAppUser.IAuthorized = await authorize_user_join(newUserConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16)
        }
    });
    typia.assert(initialAuthResponse);
    // Extract the initial access token (JWT) from the initial auth response
    const initialAccessToken = initialAuthResponse.token.access;
    // Step 2: Create new connection for the first refresh operation
    const refreshTokenConnection: api.IConnection = { host: connection.host };
    // Set the initial access token in the Authorization header for refresh 
    // This is how the API works: it uses the access token in header to find session
    refreshTokenConnection.headers = { Authorization: `Bearer ${initialAccessToken}` };
    // Step 3: Call the refresh endpoint with empty body (ITodoAppUser.IRefresh = {})
    const refreshedResponse: ITodoAppUser.IAuthorized = await authorize_user_refresh(refreshTokenConnection, {
        body: {}
    });
    typia.assert(refreshedResponse);
    // Step 4: Validate that response contains new tokens
    TestValidator.notEquals("access token was refreshed", initialAccessToken, refreshedResponse.token.access);
    TestValidator.notEquals("refresh token was rotated", initialAuthResponse.token.refresh, refreshedResponse.token.refresh);
    // Validate the expiration dates are in valid ISO 8601 format
    TestValidator.predicate("access expired_at is valid ISO format", typia.is<string & tags.Format<"date-time">>(refreshedResponse.token.expired_at));
    TestValidator.predicate("refreshable_until is valid ISO format", typia.is<string & tags.Format<"date-time">>(refreshedResponse.token.refreshable_until));
    // Step 5: Test that reusing the original access token after refresh fails (old refresh token invalidated)
    const reuseAccessConnection: api.IConnection = { host: connection.host };
    reuseAccessConnection.headers = { Authorization: `Bearer ${initialAccessToken}` }; // Same original access token
    await TestValidator.error("reusing same access token after refresh should fail", async () => {
        await authorize_user_refresh(reuseAccessConnection, { body: {} });
    });
    // Step 6: Validate that the new access token can be used for a second refresh (success)
    const secondRefreshConnection: api.IConnection = { host: connection.host };
    secondRefreshConnection.headers = { Authorization: `Bearer ${refreshedResponse.token.access}` };
    const secondRefreshedResponse: ITodoAppUser.IAuthorized = await authorize_user_refresh(secondRefreshConnection, {
        body: {}
    });
    typia.assert(secondRefreshedResponse);
    // Validate that user identity properties are preserved across refreshes
    TestValidator.equals("user display name unchanged", refreshedResponse.display_name, initialAuthResponse.display_name);
    TestValidator.equals("user email unchanged", refreshedResponse.email, initialAuthResponse.email);
    TestValidator.equals("user id unchanged", refreshedResponse.id, initialAuthResponse.id);
    TestValidator.equals("user created_at unchanged", refreshedResponse.created_at, initialAuthResponse.created_at);
    TestValidator.equals("user updated_at unchanged", refreshedResponse.updated_at, initialAuthResponse.updated_at);
}