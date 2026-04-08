import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful moderator account registration with minimum required fields.
 *
 * Validates the complete moderator registration flow including account creation, user profile initialization, and authentication token generation. Ensures that the newly created moderator account has correct default values and that the authentication tokens are properly issued.
 *
 * Special attention is given to verifying that the email and display name from the request are correctly stored, that optional fields (bio, avatar) default to null, and that the karma score starts at 0 for new accounts.
 *
 * 1. Create a new moderator-specific connection from the base connection.
 * 2. Prepare registration request with required fields: email, password, display_name, href, referrer.
 * 3. Call authorize_moderator_join utility function to register the moderator.
 * 4. Validate response structure using typia.assert.
 * 5. Verify business logic: email matches input, display_name matches input, karma is 0, bio and avatar are null, deleted_at is null.
 */
export async function test_api_moderator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration request with required fields
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneModerator.IJoin;
  // 3. Register moderator using utility function
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body,
  });
  // 4. Validate response structure
  typia.assert(authorized);
  // 5. Verify business logic
  TestValidator.equals("email matches input", authorized.email, body.email);
  TestValidator.equals(
    "display_name matches input",
    authorized.userProfile.display_name,
    body.display_name,
  );
  TestValidator.equals(
    "karma is 0 for new account",
    authorized.userProfile.karma,
    0,
  );
  TestValidator.equals(
    "bio is null (not provided)",
    authorized.userProfile.bio,
    null,
  );
  TestValidator.equals(
    "avatar is null (not provided)",
    authorized.userProfile.avatar,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (account active)",
    authorized.deleted_at,
    null,
  );
}
