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

export async function test_api_community_retrieval_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // Test case-insensitive community name matching.
  // A member creates a community with mixed-case name (e.g., 'TestCommunity').
  // The test verifies that retrieving the community using lowercase 'testcommunity'
  // returns the same community entity. This validates the case-insensitive matching
  // behavior. Both requests should return identical community data with the same id.
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community with mixed-case name
  const mixedCaseName = "TestCommunity";
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: mixedCaseName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Retrieve community using original mixed-case name
  const originalCaseCommunity = await api.functional.redditClone.communities.at(
    memberConnection,
    { communityName: mixedCaseName },
  );
  typia.assert(originalCaseCommunity);
  // 4. Retrieve community using lowercase name
  const lowerCaseCommunity = await api.functional.redditClone.communities.at(
    memberConnection,
    { communityName: mixedCaseName.toLowerCase() },
  );
  typia.assert(lowerCaseCommunity);
  // 5. Validate both retrievals return the same community
  TestValidator.equals(
    "case-insensitive retrieval returns same ID",
    originalCaseCommunity.id,
    lowerCaseCommunity.id,
  );
  TestValidator.equals(
    "case-insensitive retrieval returns same name",
    originalCaseCommunity.name,
    lowerCaseCommunity.name,
  );
  TestValidator.equals(
    "subscriber count matches",
    originalCaseCommunity.subscriber_count,
    lowerCaseCommunity.subscriber_count,
  );
}
