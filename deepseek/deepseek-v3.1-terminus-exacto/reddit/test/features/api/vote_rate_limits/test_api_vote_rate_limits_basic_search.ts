import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_vote_rate_limits_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Execute basic search with default pagination
  const searchResult =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformVoteRateLimit.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure using TestValidator
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 20", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  // Business logic validation: If there are records, verify they belong to the authenticated user
  if (searchResult.data.length > 0) {
    TestValidator.predicate(
      "at least one record returned",
      searchResult.data.length > 0,
    );
    // Validate that the user information in the records matches our authenticated user
    const firstRecord = searchResult.data[0];
    TestValidator.equals(
      "user ID matches authenticated user",
      firstRecord.user.id,
      authorizedUser.id,
    );
  }
}
