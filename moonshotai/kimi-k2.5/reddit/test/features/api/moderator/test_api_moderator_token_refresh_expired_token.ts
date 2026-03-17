import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
/**
 * Test moderator token refresh with an expired refresh token.
 * 1. Authenticate as moderator via join to get valid tokens
 * 2. Simulate token expiration by constructing a token with past expiration
 * 3. Attempt to refresh tokens
 * 4. Verify the system rejects the refresh operation with appropriate error
 */
export async function test_api_moderator_token_refresh_expired_token(connection: api.IConnection): Promise<void> {
    // Step 1: Join as moderator to establish a valid session
    const moderatorConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_moderator_join(moderatorConnection, {});
    typia.assert(authorized);
    // Step 2: Simulate an expired refresh token
    // Construct a JWT that is clearly expired (expired timestamp in the past)
    // Header: {"alg":"none","typ":"JWT"} -> base64url: eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
    // Payload: {"sub":"expired","exp":0} -> base64url: eyJzdWIiOiJleHBpcmVkIiwiZXhwIjowfQ
    // Signature: none (empty string)
    const expiredRefreshToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJleHBpcmVkIiwiZXhwIjowfQ.";
    // Step 3: Attempt to refresh with expired token and expect error
    await TestValidator.error("expired refresh token should fail", async () => {
        await api.functional.redditLike.auth.moderator.refresh(moderatorConnection, { body: { refreshToken: expiredRefreshToken } satisfies IRedditLikeModerator.IRefresh });
    });
}