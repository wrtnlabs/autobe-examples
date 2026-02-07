import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_trending_articles_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(authorized);
  // Update connection with token from authorized response
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve trending articles
  const output: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.member.articles.trending.index(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(output);
  // 3. Validate response structure
  TestValidator.predicate("has pagination", output.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(output.data));
  TestValidator.predicate("pagination has correct fields", () => {
    const p = output.pagination;
    return (
      typeof p.current === "number" &&
      typeof p.limit === "number" &&
      typeof p.records === "number" &&
      typeof p.pages === "number"
    );
  });
}
