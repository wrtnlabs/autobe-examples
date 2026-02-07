import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

// Import HttpError from nestia/fetcher
import { HttpError } from "@nestia/fetcher";

export async function test_api_user_profile_deleted_user(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID that represents a deleted user account
  const deletedUserId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the profile of a deleted user
  // The API should throw an HttpError for non-existent/deleted users
  try {
    await api.functional.discussionBoard.users.at(connection, {
      userId: deletedUserId,
    });
    // If we reach here, the test should fail
    throw new Error("Expected API to throw an error for deleted user profile");
  } catch (error) {
    // Validate that the error is an HttpError
    if (!(error instanceof HttpError)) {
      throw new Error(`Expected HttpError but got ${error}`);
    }
    // The error should indicate the user was not found (404) or gone (410)
    const expectedStatusCodes = [404, 410];
    if (!expectedStatusCodes.includes(error.status)) {
      throw new Error(
        `Expected status code 404 or 410 but got ${error.status}`,
      );
    }
  }
}