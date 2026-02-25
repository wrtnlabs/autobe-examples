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

export async function test_api_vote_rate_limits_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Test search with specific filters: entity_type='post', vote_type='upvote', user ID filter
  const searchRequest = {
    community_platform_user_id: user.id,
    entity_type: "post" as const,
    vote_type: "upvote" as const,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const searchResult =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // 3. Validate that all returned records match the filter criteria
  for (const record of searchResult.data) {
    TestValidator.equals(
      "entity_type must be 'post'",
      record.entity_type,
      "post",
    );
    TestValidator.equals(
      "vote_type must be 'upvote'",
      record.vote_type,
      "upvote",
    );
    TestValidator.equals("user ID must match", record.user.id, user.id);
  }
  // 4. Test pagination with applied filters
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );
  // 5. Test filtering by entity_type and vote_type independently
  const entityTypeFilter = {
    entity_type: "post" as const,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const entityTypeResult =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: entityTypeFilter },
    );
  typia.assert(entityTypeResult);
  const voteTypeFilter = {
    vote_type: "upvote" as const,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const voteTypeResult =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      userConnection,
      { body: voteTypeFilter },
    );
  typia.assert(voteTypeResult);
  // 6. Verify security boundary - test with different user ID
  const differentUserConnection: api.IConnection = { host: connection.host };
  const differentUser = await authorize_user_join(differentUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(differentUser);
  const differentUserFilter = {
    community_platform_user_id: differentUser.id,
    entity_type: "post" as const,
    vote_type: "upvote" as const,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformVoteRateLimit.IRequest;
  const differentUserResult =
    await api.functional.communityPlatform.user.vote_rate_limits.index(
      differentUserConnection,
      { body: differentUserFilter },
    );
  typia.assert(differentUserResult);
  // The test passes if the API responds correctly, regardless of whether records exist
  // We validate the response structure and filter application, not the data content
}
