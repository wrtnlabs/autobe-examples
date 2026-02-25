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

export async function test_api_user_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // 2. Prepare update data with both display name and bio within limits
  const updateBody = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  } satisfies IDiscussionBoardUser.IUpdate;
  // 3. Execute profile update using authorized connection
  const updatedProfile =
    await api.functional.discussionBoard.user.users.profile.update(
      userConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 4. Validate response matches update
  TestValidator.equals(
    "updated display name matches",
    updatedProfile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "updated bio matches",
    updatedProfile.bio,
    updateBody.bio,
  );
  TestValidator.notEquals(
    "updated_at should be newer than created_at",
    updatedProfile.updated_at,
    updatedProfile.created_at,
  );
  TestValidator.predicate(
    "email should remain unchanged",
    updatedProfile.email === authResult.email,
  );
  TestValidator.predicate(
    "id should remain unchanged",
    updatedProfile.id === authResult.id,
  );
  TestValidator.equals(
    "deleted_at should be null",
    updatedProfile.deleted_at,
    null,
  );
}
