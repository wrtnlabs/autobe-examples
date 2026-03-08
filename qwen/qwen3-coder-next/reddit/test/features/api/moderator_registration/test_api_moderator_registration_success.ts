import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Register a new moderator with valid credentials
  const moderator = await api.functional.redditLike.auth.moderator.join(
    connection,
    {
      body: {
        email: "moderator_test@example.com",
        username: "moderator_test_user",
        display_name: "Moderator Test",
        password: "SecurePassword123!",
        bio: "Professional moderator with 5 years experience",
        avatar_url: "https://example.com/avatar.png",
        href: "https://example.com/profile",
        referrer: "https://example.com/referrer",
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Validate moderator identity fields
  TestValidator.equals("moderator has valid id", typeof moderator.id, "string");
  TestValidator.equals(
    "moderator has valid email",
    typeof moderator.email,
    "string",
  );
  TestValidator.equals(
    "moderator has valid email_verified_at",
    typeof moderator.email_verified_at,
    "string",
  );
  TestValidator.equals(
    "moderator has valid username",
    typeof moderator.username,
    "string",
  );
  TestValidator.equals(
    "moderator has valid display_name",
    typeof moderator.display_name,
    "string",
  );
  TestValidator.equals(
    "moderator has valid bio",
    typeof moderator.bio,
    "string",
  );
  TestValidator.equals(
    "moderator bio matches input",
    moderator.bio,
    "Professional moderator with 5 years experience",
  );
  TestValidator.equals(
    "moderator has valid avatar_url",
    typeof moderator.avatar_url,
    "string",
  );
  TestValidator.equals(
    "moderator avatar_url matches input",
    moderator.avatar_url,
    "https://example.com/avatar.png",
  );
  TestValidator.equals(
    "moderator has valid karma_score",
    typeof moderator.karma_score,
    "number",
  );
  TestValidator.equals(
    "moderator has valid created_at",
    typeof moderator.created_at,
    "string",
  );
  TestValidator.equals(
    "moderator has valid updated_at",
    typeof moderator.updated_at,
    "string",
  );
  TestValidator.equals(
    "moderator has valid deleted_at",
    typeof moderator.deleted_at,
    "string",
  );
  // Validate JWT token
  TestValidator.equals(
    "token has access field",
    typeof moderator.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh field",
    typeof moderator.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token has expired_at field",
    typeof moderator.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token has refreshable_until field",
    typeof moderator.token.refreshable_until,
    "string",
  );
  // Validate initial karma score
  TestValidator.equals("initial karma is 0", moderator.karma_score, 0);
  // Validate email format
  TestValidator.predicate(
    "email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(moderator.email),
  );
}
