import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_moderator_join_registration(
  connection: api.IConnection,
) {
  // Generate random, valid moderator registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // strong password

  // Register a new moderator
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password,
        ip: null,
        href: "https://redditcommunity.fake/join",
        referrer: "https://redditcommunity.fake/home",
      } satisfies IRedditCommunityModerator.IJoin,
    });

  // Assert that the returned data conforms to expected moderator authorization structure
  typia.assert(moderator);

  // Check that the token is present and has expected fields
  TestValidator.predicate(
    "token access token present",
    typeof moderator.token.access === "string" &&
      moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh token present",
    typeof moderator.token.refresh === "string" &&
      moderator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration ISO format",
    typeof moderator.token.expired_at === "string" &&
      !!moderator.token.expired_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/,
      ),
  );
  TestValidator.predicate(
    "refreshable until ISO format",
    typeof moderator.token.refreshable_until === "string" &&
      !!moderator.token.refreshable_until.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/,
      ),
  );

  // Verify essential properties
  TestValidator.predicate(
    "moderator id is uuid format",
    typeof moderator.id === "string" &&
      !!moderator.id.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
      ),
  );
  TestValidator.equals("moderator email match", moderator.email, email);
}
