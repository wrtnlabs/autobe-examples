import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_comment_history_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving comment history for a user that does not exist.
   *
   * This test verifies that when attempting to retrieve comment history
   * for a non-existent username, the API returns a 404 Not Found error
   * instead of crashing or returning invalid data.
   */
  // Generate a random username that doesn't exist
  const nonexistentUsername: string = RandomGenerator.alphabets(10);
  // Prepare empty request body (all fields are optional)
  const body: IRedditCloneComment.IRequest = {};
  // Attempt to retrieve comment history for non-existent user
  // This should throw an HttpError with status 404
  await TestValidator.httpError(
    "should return 404 for non-existent user",
    404,
    async () =>
      await api.functional.redditClone.users.comments.index(connection, {
        username: nonexistentUsername,
        body,
      }),
  );
}
