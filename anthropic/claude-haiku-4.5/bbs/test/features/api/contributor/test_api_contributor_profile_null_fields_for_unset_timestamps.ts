import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_contributor_profile_null_fields_for_unset_timestamps(
  connection: api.IConnection,
) {
  // Register a new contributor account
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password:
        RandomGenerator.alphabets(8) +
        RandomGenerator.alphaNumeric(4).toUpperCase() +
        "!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Get the contributor's profile
  const profile =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profile);

  // Verify profile is of type IDiscussionBoardUser
  typia.assert<IDiscussionBoardUser>(profile);

  // Verify lastLoginAt is null for newly created account
  TestValidator.equals(
    "lastLoginAt should be null for new account without login",
    profile.lastLoginAt,
    null,
  );

  // Verify passwordChangedAt is null for account without password change
  TestValidator.equals(
    "passwordChangedAt should be null for account without password change",
    profile.passwordChangedAt,
    null,
  );

  // Verify other required fields exist
  TestValidator.predicate(
    "profile should have valid id",
    profile.id !== undefined && profile.id !== null,
  );

  TestValidator.predicate(
    "profile should have valid email",
    profile.email !== undefined && profile.email !== null,
  );

  TestValidator.predicate(
    "profile should have valid username",
    profile.username !== undefined && profile.username !== null,
  );

  TestValidator.predicate(
    "profile should have emailVerified field",
    typeof profile.emailVerified === "boolean",
  );

  TestValidator.predicate(
    "profile should have valid accountStatus",
    ["active", "suspended", "restricted", "deleted"].includes(
      profile.accountStatus,
    ),
  );

  TestValidator.predicate(
    "profile should have createdAt timestamp",
    profile.createdAt !== undefined && profile.createdAt !== null,
  );

  TestValidator.predicate(
    "profile should have updatedAt timestamp",
    profile.updatedAt !== undefined && profile.updatedAt !== null,
  );
}
