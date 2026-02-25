import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
 * Test retrieving detailed information of an existing article tag by a registered user.
 *
 * This test covers:
 * 1. Registered user registration.
 * 2. Retrieval of an article tag using the registered user connection.
 * 3. Validation of the returned tag data structure and correctness.
 */
export async function test_api_discussion_board_registered_user_tag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered user connection
  const userConnection: api.IConnection = { host: connection.host };
  // 2. Register a new user and capture authorization token
  const registeredUser = await authorize_registered_user_join(connection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "StrongPass#123",
    },
  });
  // 3. Set authorization header for subsequent requests
  userConnection.headers = { Authorization: registeredUser.token.access };
  // 4. Generate a sample UUID tagId (assumed to exist or simulated)
  const sampleTagId = typia.random<string & typia.tags.Format<"uuid">>();
  // 5. Call tag retrieval API endpoint
  const tag = await api.functional.discussionBoard.registeredUser.tags.at(
    userConnection,
    {
      tagId: sampleTagId,
    },
  );
  // 6. Perform full runtime validation on response
  typia.assert<IDiscussionBoardTag>(tag);
}
