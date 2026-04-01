import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_retrieval_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const username = RandomGenerator.name(1);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community with icon
  const communityIconUri = typia.random<string & tags.Format<"uri">>();
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: communityIconUri,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve community by name
  const retrievedCommunity =
    await api.functional.redditCommunity.communities.at(memberConnection, {
      communityName: community.name,
    });
  typia.assert(retrievedCommunity);
  // 4. Validate community structure
  TestValidator.equals("community id", retrievedCommunity.id, community.id);
  TestValidator.equals(
    "community name",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description",
    retrievedCommunity.description,
    community.description,
  );
  TestValidator.equals("owner id", retrievedCommunity.owner.id, memberAuth.id);
  TestValidator.equals(
    "owner username",
    retrievedCommunity.owner.username,
    username,
  );
  TestValidator.predicate(
    "owner has created_at",
    retrievedCommunity.owner.created_at !== undefined,
  );
  TestValidator.equals(
    "subscriber count is zero",
    retrievedCommunity.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "community icons array exists",
    Array.isArray(retrievedCommunity.communityIcons),
  );
  TestValidator.predicate(
    "has at least one icon",
    retrievedCommunity.communityIcons.length >= 1,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedCommunity.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedCommunity.deleted_at,
    null,
  );
  // 5. Validate icon details
  const icon = retrievedCommunity.communityIcons[0];
  TestValidator.predicate("icon has id", icon.id !== undefined);
  TestValidator.predicate("icon has storageKey", icon.storageKey !== undefined);
  TestValidator.predicate(
    "icon has originalFilename",
    icon.originalFilename !== undefined,
  );
  TestValidator.predicate("icon has mimeType", icon.mimeType !== undefined);
  TestValidator.predicate("icon has fileSize", icon.fileSize !== undefined);
}
