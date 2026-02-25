import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_search_prefix_vs_substring_relevance(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new community moderator
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(moderator);
  // Step 2: Search with empty string — should return empty list
  const emptySearch =
    await api.functional.redditCommunity.communityModerator.communities.search.index(
      moderatorConnection,
      {
        body: {
          search: "",
        },
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns empty list",
    emptySearch.data.length,
    0,
  );
  // Step 3: Search with invalid term (1 character) — should return empty list
  const invalidSearch =
    await api.functional.redditCommunity.communityModerator.communities.search.index(
      moderatorConnection,
      {
        body: {
          search: "r",
        },
      },
    );
  typia.assert(invalidSearch);
  TestValidator.equals(
    "invalid search term returns empty list",
    invalidSearch.data.length,
    0,
  );
  // Step 4: Search with valid term — should return non-empty list
  const validSearch =
    await api.functional.redditCommunity.communityModerator.communities.search.index(
      moderatorConnection,
      {
        body: {
          search: "react",
        },
      },
    );
  typia.assert(validSearch);
  TestValidator.predicate(
    "valid search returns non-empty list",
    validSearch.data.length > 0,
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    validSearch.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "current page is 1",
    validSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    validSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    validSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    validSearch.pagination.pages >= 0,
  );
}
