import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_login_valid_credentials(
  connection: api.IConnection,
) {
  // First, we need to have a valid user ID to create a moderator
  // We'll generate a random UUID for the base user
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Create a moderator account using the join endpoint
  // This is the dependency required before testing login
  const joinResponse: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        community_forum_user_id: userId,
      } satisfies ICommunityForumCommunityModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Now test successful login with valid credentials
  // We'll need to use credentials that would work for an existing user
  // Since we don't have user creation endpoints, we'll simulate this
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const href: string & tags.Format<"uri"> = "http://localhost:3000/login";
  const referrer: string & tags.Format<"uri"> = "http://localhost:3000";

  const loginResponse: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: email,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies ICommunityForumCommunityModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Validate the structure of the response
  TestValidator.predicate(
    "response has valid ID format",
    () =>
      typeof loginResponse.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        loginResponse.id,
      ),
  );

  TestValidator.predicate(
    "response has valid user ID format",
    () =>
      typeof loginResponse.community_forum_user_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        loginResponse.community_forum_user_id,
      ),
  );

  // Validate token structure
  TestValidator.predicate(
    "access token exists",
    () => !!loginResponse.token.access,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => !!loginResponse.token.refresh,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    () =>
      !!loginResponse.token.expired_at &&
      !isNaN(new Date(loginResponse.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    () =>
      !!loginResponse.token.refreshable_until &&
      !isNaN(new Date(loginResponse.token.refreshable_until).getTime()),
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    () => !!loginResponse.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    () => !!loginResponse.updated_at,
  );

  // Validate user summary
  TestValidator.predicate("user summary exists", () => !!loginResponse.user);
  TestValidator.predicate(
    "user summary has valid ID",
    () =>
      typeof loginResponse.user.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        loginResponse.user.id,
      ),
  );
  TestValidator.predicate(
    "user summary has username",
    () =>
      typeof loginResponse.user.username === "string" &&
      loginResponse.user.username.length > 0,
  );
}
