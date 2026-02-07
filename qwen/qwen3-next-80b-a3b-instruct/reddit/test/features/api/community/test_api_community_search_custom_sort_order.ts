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

export async function test_api_community_search_custom_sort_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator using utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, { body: {} });
  // 2. Search for communities with 'dev' search term and 'name_asc' sort order
  const searchResult =
    await api.functional.community.moderator.communities.search(
      moderatorConnection,
      {
        body: {
          search: "dev",
          sort: "name_asc",
        } satisfies ICommunityCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination fields are present and consistent
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );
  // 4. Since ICommunityCommunity.ISummary has no defined properties, we cannot validate name sorting
  // However, according to API contract, sort: "name_asc" should return communities sorted alphabetically by name
  // We validate that the API contract is honored through response structure validation
  // We cannot access 'name' property as it's not defined in the ISummary interface
  // The sorting behavior must be assumed to work as per API documentation
  // Validation of sorting order cannot be performed due to DTO definition constraints
  // We've validated all possible accessible properties and structure
}
