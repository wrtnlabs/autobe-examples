import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_profile_update_unauthenticated_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the registered user join. No authentication is performed for the update profile test.
  const baseConnection: api.IConnection = { host: connection.host };
  // 1. Join a registered user account to ensure user exists, but no auth token will be used in the update profile request.
  const user = await authorize_registered_user_join(baseConnection, {
    body: {
      // Properties not defined in IJoin, so pass empty object
    },
  });
  typia.assert(user);
  // 2. Attempt to update profile without authentication.
  const body = {
    display_name: "Unauthorized Update Attempt",
    bio: "This profile update should fail due to missing authentication.",
  } satisfies IDiscussionBoardRegisteredUser.IUpdate;
  // Use the base connection without auth headers to call updateProfile
  await TestValidator.httpError(
    "should reject unauthenticated profile update with 401",
    401,
    async () => {
      // Call updateProfile with the base connection that has no auth token header
      await api.functional.discussionBoard.registeredUser.profile.updateProfile(
        baseConnection,
        { body },
      );
    },
  );
}
