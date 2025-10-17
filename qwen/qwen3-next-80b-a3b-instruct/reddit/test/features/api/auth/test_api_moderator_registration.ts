import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_registration(
  connection: api.IConnection,
) {
  // Generate valid moderator registration data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string &
    tags.MinLength<3> &
    tags.MaxLength<20> &
    tags.Pattern<"^[a-zA-Z0-9_]+$"> = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password: string &
    tags.MinLength<8> &
    tags.MaxLength<128> &
    tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$"> = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();

  // Register new moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  // Validate response structure using typia.assert (COMPLETE validation)
  typia.assert(moderator);

  // Verify token structure
  TestValidator.predicate(
    "access token exists",
    () => moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => moderator.token.refresh.length > 0,
  );

  // Test duplicate email registration fails
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  });

  // Test duplicate username registration fails
  await TestValidator.error("duplicate username should fail", async () => {
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  });

  // Test valid bio optional field
  const bio: (string & tags.MaxLength<400>) | undefined =
    RandomGenerator.paragraph({ sentences: 20 });
  const moderatorWithBio: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: typia.random<
          string &
            tags.MinLength<8> &
            tags.MaxLength<128> &
            tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
        >(),
        bio,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorWithBio);
}
