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
 * Test owner retrieval of moderation appeals with pagination support.
 * 1. Auth as owner
 * 2. Retrieve appeals with pagination parameters
 * 3. Validate response structure and appeal data
 */
export async function test_api_owner_retrieve_moderation_appeals(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Retrieve appeals with pagination parameters
  const response =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 0,
  );
  // 4. Validate appeals data structure if any exist
  if (response.data.length > 0) {
    const firstAppeal = response.data[0];
    TestValidator.equals(
      "appeal has valid id format",
      typeof firstAppeal.id,
      "string",
    );
    TestValidator.equals(
      "appeal has content",
      typeof firstAppeal.appealContent,
      "string",
    );
    TestValidator.equals(
      "appeal has valid status",
      ["pending", "approved", "denied"].includes(firstAppeal.status),
      true,
    );
    TestValidator.equals(
      "appeal has reporter object",
      typeof firstAppeal.reporter,
      "object",
    );
    TestValidator.equals(
      "appeal has report object",
      typeof firstAppeal.report,
      "object",
    );
  }
  // 5. Test with different pagination parameters
  const paginatedResponse =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 5,
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit applies correctly",
    paginatedResponse.pagination.limit,
    5,
  );
  // 6. Test with status filter
  const pendingResponse =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(pendingResponse);
  // 7. Test search functionality
  const searchResponse =
    await api.functional.redditClone.owner.communities.appeals.index(
      ownerConnection,
      {
        communityId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 10,
          search: "test",
          sortBy: "created_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(searchResponse);
}
