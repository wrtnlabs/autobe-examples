import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a user profile that does not exist.
 *
 * Validates that requesting a profile with a non-existent username
 * returns a proper 404 error response.
 */
export async function test_api_user_profile_view_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random username that is guaranteed not to exist
  const nonexistentUsername = `nonexistent_user_${RandomGenerator.alphaNumeric(12)}`;
  // Attempt to retrieve profile for non-existent user
  await TestValidator.httpError(
    "404 for non-existent user profile",
    404,
    async () => {
      await api.functional.redditClone.users.profile.at(connection, {
        username: nonexistentUsername,
      });
    },
  );
}
