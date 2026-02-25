import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_registered_user_profile_retrieval_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing registered user's detailed profile
  // Since no creation API, we try with random UUID and expect either successful or 404
  const existingUserId = typia.random<string & tags.Format<"uuid">>();
  try {
    const profile = await api.functional.discussionBoard.registeredUsers.at(
      connection,
      {
        registeredUserId: existingUserId,
      },
    );
    typia.assert(profile);
    // Validate basic properties
    TestValidator.predicate(
      "profile has displayName",
      typeof profile.displayName === "string" && profile.displayName.length > 0,
    );
    TestValidator.predicate(
      "profile has isBanned boolean",
      typeof profile.isBanned === "boolean",
    );
    // Scenario 3: bio might be null or empty string
    TestValidator.predicate(
      "profile bio is string or null or undefined",
      profile.bio === undefined ||
        profile.bio === null ||
        typeof profile.bio === "string",
    );
    // Check articles and comments sorted ascending by createdAt
    TestValidator.predicate(
      "profile articles sorted ascending",
      profile.articles.every(
        (val, i, arr) => i === 0 || arr[i - 1].createdAt <= val.createdAt,
      ),
    );
    TestValidator.predicate(
      "profile comments sorted ascending",
      profile.comments.every(
        (val, i, arr) => i === 0 || arr[i - 1].createdAt <= val.createdAt,
      ),
    );
  } catch (error) {
    if (error instanceof api.HttpError && error.status === 404) {
      // User not found - fail test because we expected existing user
      throw new Error(`Registered user with ID ${existingUserId} not found`);
    }
    throw error;
  }
  // Scenario 2: Attempt to retrieve a user that does not exist
  const nonExistentUserId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "retrieve profile with non-existent UUID should fail",
    async () => {
      await api.functional.discussionBoard.registeredUsers.at(connection, {
        registeredUserId: nonExistentUserId,
      });
    },
  );
}
