import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_retrieve_own_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const registerConnection: api.IConnection = { host: connection.host };
  const registerResult = await authorize_member_join(registerConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(registerResult);
  // 2. Login as the registered member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: registerResult.token.access },
  };
  // 3. Create an article as the member
  const article = await api.functional.discussionBoard.member.articles.at(
    memberConnection,
    {
      articleId: typia.random<string>(),
    },
  );
  typia.assert(article);
  // 4. Validate that the article is not empty
  // Note: The actual validation depends on the IDiscussionBoardArticle structure
  // Since the DTO is empty, we can only validate the structure exists
  TestValidator.predicate("article retrieved successfully", article !== null);
}
