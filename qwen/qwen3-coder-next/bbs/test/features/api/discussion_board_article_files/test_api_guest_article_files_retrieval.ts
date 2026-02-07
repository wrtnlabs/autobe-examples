import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_article_files_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(guestAuth);
  // Retrieve files for a valid article
  const articleId = "123e4567-e89b-12d3-a456-426614174000";
  const filesResponse =
    await api.functional.discussionBoard.guest.articles.files.index(
      guestConnection,
      {
        articleId,
      },
    );
  typia.assert(filesResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    filesResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    filesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has record count",
    filesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has page count",
    filesResponse.pagination.pages >= 0,
  );
  // Validate file summary structure
  for (const file of filesResponse.data) {
    typia.assert<IDiscussionBoardArticleFile.ISummary>(file);
  }
}
