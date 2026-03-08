import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_list_empty_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a guest user (required authentication prerequisite)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  // 2. Create a valid article ID for testing (could be any valid UUID)
  // Since we're testing the empty state, we can use a randomly generated UUID
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the comment list API with default pagination parameters
  const response =
    await api.functional.economicPoliticalBoard.guest.articles.comments.index(
      guestConnection,
      {
        articleId: articleId,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          sortOrder: "asc",
        } satisfies IEconomicPoliticalBoardComment.IRequest,
      },
    );
  // 4. Validate the response structure
  typia.assert(response);
  // 5. Validate pagination metadata for empty comment list
  TestValidator.equals(
    "pagination.current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination.limit is 10", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination.records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is 0", response.pagination.pages, 0);
  // 6. Validate that data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
}
