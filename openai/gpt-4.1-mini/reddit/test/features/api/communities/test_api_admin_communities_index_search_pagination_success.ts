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
 * Test retrieving a paginated list of communities with a valid search filter and
 * sorting by popularity.
 * Validates the response includes community summaries with required fields.
 * Checks pagination metadata validity.
 * Confirms authorized admin access using join.
 */
export async function test_api_admin_communities_index_search_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(
      { host: connection.host },
      {
        body: {
          email: RandomGenerator.alphabets(10) + "@example.com",
          password: "StrongPassword123!",
          displayName: RandomGenerator.name(1),
          bio: null,
          avatarUrl: null,
        },
      },
    );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare request to list communities with search filter and popular sort
  const searchName = "a";
  const requestBody: ICommunityPlatformCommunity.IRequest = {
    name: searchName,
    page: 1,
    limit: 10,
    sort: "popular",
  };
  // 3. Call the admin communities index API
  const response: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.admin.communities.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // 4. Assert full response structure
  typia.assert(response);
  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // 6. Validate community summaries data
  for (const community of response.data) {
    typia.assert(community);
    TestValidator.predicate(
      "community id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      "community name includes search string",
      community.name.includes(searchName),
    );
    TestValidator.predicate(
      "subscriber count is non-negative",
      community.subscriberCount >= 0,
    );
    TestValidator.predicate(
      "owner user has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        community.ownerUser.id,
      ),
    );
  }
}
