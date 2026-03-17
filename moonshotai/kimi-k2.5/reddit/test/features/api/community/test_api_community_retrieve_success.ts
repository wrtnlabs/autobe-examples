import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using the utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community through the prerequisite endpoint using utility
  const createdCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Call GET /redditLike/communities/{communityId} with a valid community ID
  const retrievedCommunity = await api.functional.redditLike.communities.at(
    { host: connection.host },
    {
      communityId: createdCommunity.id,
    },
  );
  // 4. Validate the response structure and business logic
  typia.assert(retrievedCommunity);
  TestValidator.equals(
    "retrieved community id matches created",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.predicate(
    "subscriber_count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "active community has null deleted_at",
    retrievedCommunity.deleted_at === null,
  );
}
