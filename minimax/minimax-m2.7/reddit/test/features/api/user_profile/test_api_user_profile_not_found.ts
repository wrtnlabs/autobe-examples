import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a non-existent user profile by username.
  // Send a GET request with a username that does not exist in the system.
  // Verify the response returns HTTP 404 Not Found status.
  // This validates the business rule that the system must return 404 when a username does not exist
  // or the member is soft-deleted (deleted_at is not null).
  // Generate a unique non-existent username that is unlikely to match any existing user
  const nonExistentUsername = `nonexistent_user_${RandomGenerator.alphaNumeric(16)}`;
  // Attempt to retrieve profile for non-existent user and verify 404 response
  await TestValidator.httpError(
    "non-existent user returns 404",
    404,
    async () => {
      await api.functional.redditClone.users.at(connection, {
        username: nonExistentUsername,
      });
    },
  );
}
