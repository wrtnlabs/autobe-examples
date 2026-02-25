import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
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

export async function test_api_article_tag_mapping_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test successfully retrieving an existing article-tag mapping by its unique mappingId
  // as a registered user. Also test trying to retrieve a non-existent mappingId.
  // 1. Register and authorize a registered user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Generate a random valid article-tag mapping
  const validMapping = typia.random<IDiscussionBoardArticleTagMapping>();
  // 3. Try to retrieve the valid mapping assuming it's existing
  // As we can't create the real resource, simulate fetching will return random, so we validate shape
  const retrieved =
    await api.functional.discussionBoard.registeredUser.article_tag_mappings.atArticleTagMapping(
      userConnection,
      { mappingId: validMapping.id },
    );
  typia.assertGuardEquals(retrieved);
  // Validate the expected properties strictly
  TestValidator.predicate(
    "article-tag mapping has associated article",
    retrieved.article !== null && typeof retrieved.article === "object",
  );
  TestValidator.predicate(
    "article-tag mapping has associated tag",
    retrieved.tag !== null && typeof retrieved.tag === "object",
  );
  // 4. Try to retrieve with a non-existent mapping ID (random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent mapping returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.article_tag_mappings.atArticleTagMapping(
        userConnection,
        { mappingId: nonExistentId },
      );
    },
  );
}
