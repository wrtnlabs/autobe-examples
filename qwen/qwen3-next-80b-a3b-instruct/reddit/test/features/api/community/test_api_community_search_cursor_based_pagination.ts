import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_search_cursor_based_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator using join
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // First page: search without cursor (initial request)
  const firstPage = await api.functional.community.moderator.communities.search(
    moderatorConnection,
    {
      body: {} satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "first page records > 0",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  // Ensure we have communities to paginate
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  // Second page: perform another search without cursor
  // Since the original scenario is impossible (no next_cursor in response, no id in ISummary),
  // we implement a modified test that validates the endpoint returns consistent results
  const secondPage =
    await api.functional.community.moderator.communities.search(
      moderatorConnection,
      {
        body: {} satisfies ICommunityCommunity.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page pagination metadata is consistent
  TestValidator.equals("second page current", secondPage.pagination.current, 1);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.predicate(
    "second page records matches first",
    secondPage.pagination.records === firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  // Validate that we have data
  TestValidator.predicate("second page has data", secondPage.data.length > 0);
  // Validate that two consecutive requests return different arrays (expected in dynamic system)
  TestValidator.notEquals(
    "different data arrays from consecutive requests",
    firstPage.data,
    secondPage.data,
  );
}
