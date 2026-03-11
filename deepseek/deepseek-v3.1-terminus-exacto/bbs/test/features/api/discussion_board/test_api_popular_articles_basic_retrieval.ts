import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_articles_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection with authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Retrieve popular articles with default pagination
  const response = await api.functional.discussionBoard.guest.popular.index(
    guestConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination calculations
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      response.pagination.pages === 0,
  );
  // Validate that data array length matches pagination limit (except for last page)
  if (response.pagination.current < response.pagination.pages) {
    TestValidator.equals(
      "data length matches limit on non-last page",
      response.data.length,
      response.pagination.limit,
    );
  } else {
    TestValidator.predicate(
      "data length is valid on last page",
      response.data.length <= response.pagination.limit,
    );
  }
  // Test multiple pages to verify pagination consistency
  if (response.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.discussionBoard.guest.popular.index(
        guestConnection,
        {
          body: {
            page: 2,
            limit: response.pagination.limit,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    // Verify that different pages return different articles
    if (response.data.length > 0 && secondPageResponse.data.length > 0) {
      TestValidator.notEquals(
        "different pages return different articles",
        response.data[0].id,
        secondPageResponse.data[0].id,
      );
    }
  }
}
