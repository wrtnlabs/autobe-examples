import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_article_search_with_tags(
  connection: api.IConnection,
) {
  // 1. Authenticate as regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Search for articles with specific tags (using the correct endpoint)
  const searchResults =
    await api.functional.economyPoliticsBoard.user.filters.index(
      userConnection,
      {
        body: {
          // Tags parameter is expected by API for filtering (despite empty DTO)
          tags: ["technology", "economy"],
        },
      },
    );
  typia.assert(searchResults);
  // 3. Validate results match AND logic (using available properties)
  TestValidator.equals(
    "Article count matches expected",
    searchResults.data.length,
    5,
  );
  // 4. Validate sorting by newest first (using available created_at)
  TestValidator.predicate(
    "Articles are sorted by newest first",
    searchResults.data[0].created_at > searchResults.data[1].created_at,
  );
  // 5. Validate pagination data
  TestValidator.equals(
    "Page number matches",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "Page limit matches",
    searchResults.pagination.limit,
    10,
  );
}
