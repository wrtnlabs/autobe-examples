import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_articles_listing_and_search(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {});
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  {
    const body: IDiscussionBoardArticle.IRequest = {};
    const response =
      await api.functional.discussionBoard.registeredUser.articles.index(
        userConnection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination available",
      response.pagination !== null && response.pagination !== undefined,
    );
    TestValidator.predicate(
      "data is array",
      Array.isArray(response.data) && response.data.length >= 0,
    );
    for (const article of response.data) {
      typia.assert(article);
      TestValidator.predicate("article is IEntity", typeof article === "object");
    }
    const { current, limit, pages, records } = response.pagination;
    TestValidator.predicate("current page >= 1", current >= 1);
    TestValidator.predicate("limit >= 0", limit >= 0);
    TestValidator.predicate("pages >= 0", pages >= 0);
    TestValidator.predicate("records >= 0", records >= 0);
    TestValidator.equals(
      "pages correct",
      pages,
      records === 0 ? 0 : Math.ceil(records / limit),
    );
  }
  {
    const body: IDiscussionBoardArticle.IRequest = {};
    const response =
      await api.functional.discussionBoard.registeredUser.articles.index(
        userConnection,
        { body },
      );
    typia.assert(response);
    for (const article of response.data) {
      typia.assert(article);
      TestValidator.predicate("article is IEntity", typeof article === "object");
    }
    const { current, limit, pages, records } = response.pagination;
    TestValidator.predicate("current page >= 1", current >= 1);
    TestValidator.predicate("limit >= 0", limit >= 0);
    TestValidator.predicate("pages >= 0", pages >= 0);
    TestValidator.predicate("records >= 0", records >= 0);
    TestValidator.equals(
      "pages correctly calculated",
      pages,
      records === 0 ? 0 : Math.ceil(records / limit),
    );
  }
}
