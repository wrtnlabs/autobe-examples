import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserProfile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

/**
 * Test unauthorized access for profile update API endpoint.
 *
 * This test tries to update the registered user's profile without providing
 * authentication headers and expects an HTTP 401 Unauthorized error. It ensures
 * the endpoint is protected against unauthorized access.
 */
export async function test_api_registered_user_profile_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Directly try to update profile without authentication
  // Create a new connection without token
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const updateBody = {
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardRegisteredUserProfile.IUpdate;
  // Expect HTTP error 401 or 403 indicating unauthorized access
  await TestValidator.httpError(
    "unauthorized profile update attempt",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.registeredUser.profile.update(
        unauthenticatedConnection,
        { body: updateBody },
      );
    },
  );
}
