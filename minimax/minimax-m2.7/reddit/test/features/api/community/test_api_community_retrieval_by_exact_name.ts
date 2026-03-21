import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_community_retrieval_by_exact_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community to retrieve in the test
  const createdCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(createdCommunity);
  // 3. Retrieve the community by its exact name
  const retrievedCommunity = await api.functional.redditClone.communities.at(
    connection,
    { communityName: createdCommunity.name },
  );
  typia.assert(retrievedCommunity);
  // 4. Validate all fields match
  TestValidator.equals(
    "community id matches",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name matches exactly",
    retrievedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "description matches",
    retrievedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "subscriber_count is 0 for new community",
    retrievedCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "owner username matches creator",
    retrievedCommunity.owner.username,
    member.username,
  );
  TestValidator.equals(
    "posts_count is 0 for new community",
    retrievedCommunity.posts_count,
    0,
  );
  TestValidator.equals(
    "comments_count is 0 for new community",
    retrievedCommunity.comments_count,
    0,
  );
  TestValidator.equals(
    "moderators_count is 0 for new community",
    retrievedCommunity.moderators_count,
    0,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedCommunity.created_at !== null &&
      retrievedCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedCommunity.updated_at !== null &&
      retrievedCommunity.updated_at !== undefined,
  );
}
