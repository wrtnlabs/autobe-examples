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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_article_tag_mapping_list_filtered_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and create user-specific connection
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies IDiscussionBoardRegisteredUser.IJoin,
    },
  );
  typia.assert(registeredUser);
  // 2. Prepare to filter article-tag mappings: We need at least one article-tag mapping
  // For testing, pick first article-tag mapping from unfiltered list
  // Fetch without filter to get existing article-tag mappings
  const initialList =
    await api.functional.discussionBoard.registeredUser.article_tag_mappings.index(
      registeredUserConnection,
      {
        body: {},
      },
    );
  typia.assert(initialList);
  // Confirm that initialList has at least one mapping to filter
  if (initialList.data.length === 0) {
    // If no mappings exist, skip the rest because we cannot test filtering properly
    return;
  }
  // Pick first record to set filter criteria
  const firstMapping = initialList.data[0];
  // 3. Query filtered and paginated list with specific articleId and tagId
  const filteredRequest: IDiscussionBoardArticleTagMapping.IRequest = {
    articleId: firstMapping.discussionBoardArticleId,
    tagId: firstMapping.discussionBoardTagId,
    page: 1,
    limit: 10,
  };
  const filteredList =
    await api.functional.discussionBoard.registeredUser.article_tag_mappings.index(
      registeredUserConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredList);
  // 4. Validate pagination metadata integrity
  const pagination = filteredList.pagination;
  TestValidator.predicate("current page >= 1", pagination.current >= 1);
  TestValidator.predicate("limit > 0", pagination.limit > 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  // 5. Validate that each record corresponds to filtered articleId and tagId
  for (const record of filteredList.data) {
    TestValidator.equals(
      "record articleId matches filter",
      record.discussionBoardArticleId,
      filteredRequest.articleId,
    );
    TestValidator.equals(
      "record tagId matches filter",
      record.discussionBoardTagId,
      filteredRequest.tagId,
    );
  }
}
