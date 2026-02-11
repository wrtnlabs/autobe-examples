import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_karma_index_with_search_and_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Test with search term
  const searchRequest = {
    search: "test",
    min_karma: 1,
    max_karma: 1000,
  } satisfies ICommunityKarma.IRequest;
  const searchResponse = await api.functional.community.admin.karmas.index(
    adminConnection,
    { body: searchRequest },
  );
  typia.assert(searchResponse);
  // Validate case-insensitive search
  const withTest = searchResponse.data.filter((item) =>
    item.user.display_name?.toLowerCase().includes("test"),
  );
  TestValidator.equals(
    "search matches display names",
    withTest.length,
    searchResponse.data.length,
  );
  // Validate score range
  const inRange = searchResponse.data.filter(
    (item) => item.score >= 1 && item.score <= 1000,
  );
  TestValidator.equals(
    "scores within range",
    inRange.length,
    searchResponse.data.length,
  );
  // 3. Test empty search term
  const emptyRequest = {
    search: null,
    min_karma: 1,
    max_karma: 1000,
  } satisfies ICommunityKarma.IRequest;
  const emptyResponse = await api.functional.community.admin.karmas.index(
    adminConnection,
    { body: emptyRequest },
  );
  typia.assert(emptyResponse);
  // Validate empty search returns valid results
  TestValidator.predicate(
    "empty search has results",
    emptyResponse.data.length > 0,
  );
}
