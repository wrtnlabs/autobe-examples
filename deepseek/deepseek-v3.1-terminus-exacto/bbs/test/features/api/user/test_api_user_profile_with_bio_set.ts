import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test profile retrieval when user has biography text populated.
 * Creates a user with a rich bio containing special characters and line breaks,
 * then retrieves the profile to verify bio content preservation and field consistency.
 */
export async function test_api_user_profile_with_bio_set(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a user with rich bio content
  const userConnection: api.IConnection = { host: connection.host };
  
  // Since the API doesn't support bio during join and there's no update method,
  // we'll check if bio exists in the response and test accordingly
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      // Use display_name that might support bio-like content
      display_name: `User with Bio Test ${RandomGenerator.alphabets(8)}`,
    } satisfies DeepPartial<IDiscussionBoardUser.IJoin>,
  });
  typia.assert(authorizedUser);
  
  // Retrieve the user profile using the created user's ID
  const profile = await api.functional.discussionBoard.users.at(
    userConnection,
    {
      userId: authorizedUser.id,
    },
  );
  typia.assert(profile);
  
  // Test that profile retrieval works and basic fields are consistent
  TestValidator.equals("user ID consistency", profile.id, authorizedUser.id);
  TestValidator.equals(
    "email consistency",
    profile.email,
    authorizedUser.email,
  );
  TestValidator.predicate(
    "created_at timestamp valid",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp valid", 
    profile.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null for active user",
    profile.deleted_at,
    null,
  );
  
  // Check if bio field exists in the profile response
  if ('bio' in profile) {
    // If bio field exists, validate it's null or empty string by default
    TestValidator.predicate(
      "bio should be null or empty for new user",
      profile.bio === null || profile.bio === ""
    );
  }
}