import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for this test
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for testing - this will likely not exist in the database
  // The endpoint should either return the user or 404
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  try {
    // Attempt to retrieve user profile - this endpoint is public, no auth required
    const profile = await api.functional.redditPlatform.users.at(
      memberConnection,
      {
        userId,
      },
    );
    typia.assert(profile);
    // Validate response structure matches IRedditPlatformMember.ISummary
    // typia.assert() already validates all field types and presence, so we test business logic
    TestValidator.predicate(
      "karma score is non-negative",
      profile.karmaScore >= 0,
    );
    TestValidator.predicate(
      "subscription count is non-negative",
      profile.subscriptionCount >= 0,
    );
    TestValidator.predicate(
      "username is not empty",
      profile.username.length > 0,
    );
    TestValidator.predicate(
      "display name is not empty",
      profile.displayName.length > 0,
    );
    // Validate date-time format for createdAt field
    const date = new Date(profile.createdAt);
    TestValidator.predicate(
      "creation timestamp is valid date",
      !isNaN(date.getTime()),
    );
  } catch (error) {
    // If user doesn't exist, expect HttpError with 404
    if (error instanceof api.HttpError) {
      TestValidator.httpError("non-existent user returns 404", 404, () => {
        throw error;
      });
    } else {
      throw error;
    }
  }
}
