import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test querying communities with a search filter that matches no communities.
 *
 * This test verifies that when the admin queries communities using a name filter
 * that matches no existing communities, the service responds with an empty data
 * array and correct pagination metadata. It confirms that admin authorization
 * is correctly enforced by performing an admin join authentication before making
 * the request.
 *
 * Validations include:
 * 1. Successful admin authorization
 * 2. API call returns with an empty list
 * 3. Pagination metadata has zero records and zero pages
 * 4. No errors or exceptions occur
 */
export async function test_api_admin_communities_index_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: `admin_${typia.random<string & import("typia").tags.Format<"email">>()}`,
        password: "StrongPassword123!",
        displayName: "Admin Tester",
        bio: null,
        avatarUrl: null,
      },
    });
  typia.assert(adminAuthorized);
  // Update the admin connection with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Perform the community search with a filter guaranteed to return no results
  const body: ICommunityPlatformCommunity.IRequest = {
    name: "nonexistent_community_search_filter",
    page: 1,
    limit: 10,
    sort: "new",
  };
  const response: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.admin.communities.index(
      adminConnection,
      {
        body,
      },
    );
  // 3. Assert types and structure of response
  typia.assert(response);
  // 4. Validate that the data array is empty
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 0);
  TestValidator.equals("pagination pages", response.pagination.pages, 0);
}
