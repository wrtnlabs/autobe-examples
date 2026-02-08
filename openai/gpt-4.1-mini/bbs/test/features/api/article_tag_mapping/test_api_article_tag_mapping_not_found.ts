import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
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

export async function test_api_article_tag_mapping_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for registered user and join
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  // Update userConnection headers with token
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare a random UUID that does not exist
  const nonExistentMappingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to get article-tag mapping by non-existent mappingId
  //    This should throw an HttpError with status 404
  await TestValidator.httpError(
    "should return 404 for non-existent article-tag mapping",
    404,
    async () => {
      await api.functional.discussionBoard.article_tag_mappings.at(
        userConnection,
        {
          mappingId: nonExistentMappingId,
        },
      );
    },
  );
}
