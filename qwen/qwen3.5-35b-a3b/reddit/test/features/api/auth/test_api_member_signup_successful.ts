import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_signup_successful(connection: api.IConnection): Promise<void> {
    // Create a new member connection for registration
    const joinConnection: api.IConnection = { host: connection.host };
    // Generate valid registration data
    const email = typia.random<string & tags.Format<"email">>();
    const username = RandomGenerator.alphaNumeric(10);
    const password = RandomGenerator.alphaNumeric(12);
    const displayName = RandomGenerator.name();
    const bio = RandomGenerator.paragraph({ sentences: 2 });
    const avatarUrl = typia.random<string & tags.Format<"uri">>() || null;
    const href = typia.random<string & tags.Format<"uri">>();
    const referrer = typia.random<string & tags.Format<"uri">>();
    const ip = typia.random<string & tags.Format<"ipv4">>();
    // Register new member using utility function
    const response = await authorize_member_join(joinConnection, {
        body: {
            email,
            username,
            password,
            displayName,
            bio,
            avatarUrl,
            href,
            referrer,
            ip,
        } satisfies IRedditPlatformMember.IJoin,
    });
    // Validate response type
    typia.assert(response);
    // Validate authentication tokens are present and non-empty
    TestValidator.predicate("access token is non-empty", () => response.access.length > 0);
    TestValidator.predicate("refresh token is non-empty", () => response.refresh.length > 0);
    // Validate token expiration timestamps
    typia.assert(response.expired_at);
    // Validate user profile summary
    const user = response.user;
    typia.assert(user);
    TestValidator.equals("user id is string", typeof user.id, "string");
    TestValidator.equals("user username matches registration", user.username, username);
    TestValidator.equals("user display_name matches registration", user.display_name, displayName);
    TestValidator.equals("user karma score is 0", user.karma_score, 0);
    TestValidator.equals("user is active", user.is_active, true);
    typia.assert(user.created_at);
    // Validate full response data
    TestValidator.equals("member id matches user id", response.id, user.id);
    TestValidator.equals("response username matches registration", response.username, username);
    TestValidator.equals("response display_name matches registration", response.display_name, displayName);
    TestValidator.equals("response karma_score is 0", response.karma_score, 0);
    TestValidator.equals("response is_active is true", response.is_active, true);
    TestValidator.equals("response bio matches registration", response.bio, bio);
    TestValidator.equals("response avatar_url matches registration", response.avatar_url, avatarUrl);
    typia.assert(response.created_at);
    typia.assert(response.updated_at);
    TestValidator.equals("response deleted_at is null", response.deleted_at, null);
    // Validate sessions array (should have at least one session)
    typia.assert(response.sessions);
    TestValidator.predicate("sessions is array", () => Array.isArray(response.sessions));
    TestValidator.equals("at least one session created", response.sessions.length > 0, true);
    // Validate empty collections for new user
    TestValidator.predicate("posts is array", () => Array.isArray(response.posts));
    TestValidator.predicate("comments is array", () => Array.isArray(response.comments));
    TestValidator.predicate("postVotes is array", () => Array.isArray(response.postVotes));
    TestValidator.predicate("commentVotes is array", () => Array.isArray(response.commentVotes));
    TestValidator.predicate("reports is array", () => Array.isArray(response.reports));
    // Validate authorization token structure
    typia.assert(response.token);
    TestValidator.predicate("token access is non-empty", () => response.token.access.length > 0);
    TestValidator.predicate("token refresh is non-empty", () => response.token.refresh.length > 0);
    typia.assert(response.token.expired_at);
    typia.assert(response.token.refreshable_until);
}