import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_profile_with_login_history(
  connection: api.IConnection,
) {
  // Step 1: Retrieve contributor profile with a valid UUID
  // Note: Since only the GET endpoint is available, we test the response structure
  // for any contributor ID that may exist in the system
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  const contributor = await api.functional.discussionBoard.contributors.at(
    connection,
    {
      contributorId: contributorId,
    },
  );

  // Step 2: Validate the response structure matches IDiscussionBoardContributor type
  typia.assert(contributor);

  // Step 3: Verify core profile properties
  TestValidator.predicate(
    "contributor ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contributor.id,
    ),
  );
  TestValidator.predicate(
    "email contains valid format",
    contributor.email.includes("@") && contributor.email.length > 0,
  );
  TestValidator.predicate(
    "username meets length requirements",
    contributor.username.length >= 3 && contributor.username.length <= 50,
  );
  TestValidator.predicate(
    "username contains only valid characters",
    /^[a-zA-Z0-9_]+$/.test(contributor.username),
  );

  // Step 4: Verify account status is one of the valid enum values
  const validStatuses = ["active", "suspended", "restricted", "deleted"];
  TestValidator.predicate(
    "account status is valid enum value",
    validStatuses.includes(contributor.account_status),
  );

  // Step 5: Verify email_verified is a boolean value
  TestValidator.predicate(
    "email_verified is boolean type",
    typeof contributor.email_verified === "boolean",
  );

  // Step 6: Validate all timestamp fields exist and are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date string",
    !isNaN(new Date(contributor.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date string",
    !isNaN(new Date(contributor.updated_at).getTime()),
  );

  // Step 7: Verify timestamp logical consistency
  const createdDate = new Date(contributor.created_at);
  const updatedDate = new Date(contributor.updated_at);
  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedDate >= createdDate,
  );

  // Step 8: Validate login history timestamp if populated
  // This field is optional (nullable/undefined) for accounts that haven't logged in
  if (
    contributor.last_login_at !== null &&
    contributor.last_login_at !== undefined
  ) {
    TestValidator.predicate(
      "last_login_at is valid date string when present",
      !isNaN(new Date(contributor.last_login_at).getTime()),
    );

    const lastLoginDate = new Date(contributor.last_login_at);

    TestValidator.predicate(
      "last_login_at is not before account creation",
      lastLoginDate >= createdDate,
    );
    TestValidator.predicate(
      "last_login_at is not after current time",
      lastLoginDate <= new Date(),
    );
    TestValidator.predicate(
      "last_login_at indicates active usage history",
      lastLoginDate.getTime() > 0,
    );
  }

  // Step 9: Validate soft delete timestamp if populated
  if (contributor.deleted_at !== null && contributor.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid date string when present",
      !isNaN(new Date(contributor.deleted_at).getTime()),
    );

    const deletedDate = new Date(contributor.deleted_at);
    TestValidator.predicate(
      "deleted_at is not before updated_at",
      deletedDate >= updatedDate,
    );
  }
}
