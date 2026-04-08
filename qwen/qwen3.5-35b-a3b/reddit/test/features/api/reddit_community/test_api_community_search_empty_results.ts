import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Search for communities with non-existent term
  const searchRequest = {
    name: "nonexistent_community_xyz_123",
  } satisfies IRedditCommunityCommunity.IRequest;
  const response = await api.functional.redditCommunity.admin.communities.index(
    adminConnection,
    { body: searchRequest },
  );
  typia.assert(response);
  // 3. Validate empty results structure
  TestValidator.equals(
    "empty search has zero records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search has empty data array",
    response.data.length,
    0,
  );
  TestValidator.equals(
    "empty search starts at page 1",
    response.pagination.current,
    1,
  );
}
