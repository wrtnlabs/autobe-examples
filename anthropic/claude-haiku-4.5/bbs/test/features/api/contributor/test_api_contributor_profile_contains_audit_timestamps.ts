import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_contributor_profile_contains_audit_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account to get authentication
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Verify that the authorized response contains audit timestamps
  TestValidator.predicate(
    "created_at field exists and is not null",
    contributor.created_at !== null && contributor.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at field exists and is not null",
    contributor.updated_at !== null && contributor.updated_at !== undefined,
  );

  // Step 3: Validate timestamp format (ISO 8601)
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  TestValidator.predicate(
    "created_at is in ISO 8601 format",
    iso8601Pattern.test(contributor.created_at),
  );
  TestValidator.predicate(
    "updated_at is in ISO 8601 format",
    iso8601Pattern.test(contributor.updated_at),
  );

  // Step 4: Validate that createdAt and updatedAt are reasonable timestamps
  const createdAtTime = new Date(contributor.created_at).getTime();
  const updatedAtTime = new Date(contributor.updated_at).getTime();
  const now = new Date().getTime();
  const oneHourMs = 60 * 60 * 1000;

  TestValidator.predicate(
    "created_at is within the last hour",
    now - createdAtTime < oneHourMs,
  );
  TestValidator.predicate(
    "updated_at is within the last hour",
    now - updatedAtTime < oneHourMs,
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAtTime <= updatedAtTime,
  );

  // Step 5: Retrieve the profile via the dedicated profile endpoint
  const profile =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profile);

  // Step 6: Verify profile contains all required audit timestamp fields
  TestValidator.predicate(
    "profile has createdAt field",
    profile.createdAt !== null && profile.createdAt !== undefined,
  );
  TestValidator.predicate(
    "profile has updatedAt field",
    profile.updatedAt !== null && profile.updatedAt !== undefined,
  );

  // Step 7: Validate profile timestamp formats (ISO 8601)
  TestValidator.predicate(
    "profile createdAt is in ISO 8601 format",
    iso8601Pattern.test(profile.createdAt),
  );
  TestValidator.predicate(
    "profile updatedAt is in ISO 8601 format",
    iso8601Pattern.test(profile.updatedAt),
  );

  // Step 8: Validate optional timestamps if present
  if (profile.lastLoginAt !== null && profile.lastLoginAt !== undefined) {
    TestValidator.predicate(
      "lastLoginAt is in ISO 8601 format",
      iso8601Pattern.test(profile.lastLoginAt),
    );
    const lastLoginTime = new Date(profile.lastLoginAt).getTime();
    TestValidator.predicate(
      "lastLoginAt is after or equal to createdAt",
      lastLoginTime >= createdAtTime,
    );
  }

  if (
    profile.passwordChangedAt !== null &&
    profile.passwordChangedAt !== undefined
  ) {
    TestValidator.predicate(
      "passwordChangedAt is in ISO 8601 format",
      iso8601Pattern.test(profile.passwordChangedAt),
    );
    const passwordChangedTime = new Date(profile.passwordChangedAt).getTime();
    TestValidator.predicate(
      "passwordChangedAt is after or equal to createdAt",
      passwordChangedTime >= createdAtTime,
    );
  }

  // Step 9: Verify timestamps match between join response and profile endpoint
  TestValidator.equals(
    "created_at from join response matches profile createdAt",
    new Date(contributor.created_at).getTime(),
    new Date(profile.createdAt).getTime(),
  );
  TestValidator.equals(
    "updated_at from join response matches profile updatedAt",
    new Date(contributor.updated_at).getTime(),
    new Date(profile.updatedAt).getTime(),
  );
}
