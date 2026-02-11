import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_admin_members_search_display_name(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityAdmin.ILogin,
  });
  // 2. Create search query with partial display name 'john'
  const searchQuery = {
    search: "john",
    page: 1,
    limit: 10,
  } satisfies ICommunityMember.IRequest;
  // 3. Call API with search query
  const results: IPageICommunityMember.ISummary =
    await api.functional.community.admin.members.index(adminConnection, {
      body: searchQuery,
    });
  typia.assert(results);
  // 4. Validate that results include members with display_name containing 'john' (case-insensitive)
  const matchingMembers = results.data.filter((member) =>
    member.display_name?.toLowerCase().includes("john"),
  );
  // Verify case-insensitive match exists
  TestValidator.predicate(
    "case-insensitive search should return matching results",
    matchingMembers.length > 0,
  );
  // Verify pagination metadata shows correct total
  TestValidator.equals(
    "pagination records count matches",
    results.pagination.records,
    50,
  );
  TestValidator.equals(
    "pagination current page matches",
    results.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    results.pagination.limit,
    10,
  );
}
