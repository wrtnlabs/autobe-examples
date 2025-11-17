import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_registered_user_registration_public(
  connection: api.IConnection,
) {
  // Generate a unique email for registration
  const email =
    `${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
      tags.Format<"email">;

  // Define a plain text password
  const password = RandomGenerator.alphaNumeric(16);

  // Prepare request body adhering to IRedditCommunityRegisteredUser.ICreate
  const requestBody = {
    email,
    password,
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  // Call the API to create a new registered user
  const user: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunityRegisteredusers.create(
      connection,
      { body: requestBody },
    );
  typia.assert(user);

  // Validate the returned user data
  TestValidator.predicate(
    "valid UUID format for user id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      user.id,
    ),
  );
  TestValidator.equals("email matches requested email", user.email, email);
  TestValidator.predicate(
    "created_at is a string formatted date-time",
    typeof user.created_at === "string" && user.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a string formatted date-time",
    typeof user.updated_at === "string" && user.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    user.deleted_at === null || user.deleted_at === undefined,
  );
}
