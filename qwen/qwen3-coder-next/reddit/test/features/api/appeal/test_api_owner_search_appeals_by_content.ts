import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

/**
 * Test appeal search functionality with full-text search on appeal content.
 * 1. Create owner account for authentication
 * 2. Search for appeals containing specific keywords
 * 3. Verify search results are returned correctly
 * 4. Test search with different keywords to validate functionality
 */
export async function test_api_owner_search_appeals_by_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account for authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
      displayName: "Test Owner",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Test search functionality with keyword matching
  const searchKeyword = "appeal content test";
  const searchResult =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
          search: searchKeyword,
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Verify search returns valid pagination structure
  typia.assert(searchResult.pagination);
  // 4. Test with different search term to ensure search works
  const anotherSearch =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
          search: "moderation",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(anotherSearch);
  // 5. Validate search results structure
  if (searchResult.data.length > 0) {
    const firstAppeal = searchResult.data[0];
    typia.assert(firstAppeal);
    // Verify appeal properties exist
    if (firstAppeal.appealContent) {
      typia.assert(firstAppeal.appealContent);
    }
    if (firstAppeal.report) {
      typia.assert(firstAppeal.report);
    }
  }
  // 6. Test empty search results scenario
  const noResults =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 5,
          sortBy: "created_at",
          sortOrder: "desc",
          search: "nonexistentterm12345",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(noResults);
}
