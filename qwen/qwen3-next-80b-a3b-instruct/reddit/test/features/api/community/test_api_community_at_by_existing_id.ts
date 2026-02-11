import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_at_by_existing_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner to create a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // 2. Create a community using the authorized connection
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Verify community creation resulted in expected properties
  TestValidator.predicate("description exists", community.description !== null);
  TestValidator.predicate(
    "icon_url is optional",
    community.icon_url === null || typeof community.icon_url === "string",
  );
  TestValidator.equals(
    "subscriber_count starts at 1",
    community.subscriber_count,
    1,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    new Date(community.created_at).toISOString() === community.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    new Date(community.updated_at).toISOString() === community.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    community.deleted_at,
    null,
  );
  TestValidator.predicate(
    "owner display_name is present",
    typeof community.owner.display_name === "string",
  );
  TestValidator.predicate(
    "owner bio is optional",
    community.owner.bio === null || typeof community.owner.bio === "string",
  );
  TestValidator.predicate(
    "owner avatar_url is optional",
    community.owner.avatar_url === null ||
      typeof community.owner.avatar_url === "string",
  );
  // 4. Retrieve community by ID using the base connection (no authentication required)
  const retrievedCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      id: community.id,
    });
  typia.assert(retrievedCommunity);
  // 5. Validate retrieved community matches exactly what was created
  TestValidator.equals(
    "community ID matches",
    retrievedCommunity.id,
    community.id,
  );
  TestValidator.equals("name matches", retrievedCommunity.name, community.name);
  TestValidator.equals(
    "description matches",
    retrievedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "icon_url matches",
    retrievedCommunity.icon_url,
    community.icon_url,
  );
  TestValidator.equals(
    "subscriber_count matches",
    retrievedCommunity.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedCommunity.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedCommunity.updated_at,
    community.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedCommunity.deleted_at,
    null,
  );
  TestValidator.equals(
    "owner display_name matches",
    retrievedCommunity.owner.display_name,
    community.owner.display_name,
  );
  TestValidator.equals(
    "owner bio matches",
    retrievedCommunity.owner.bio,
    community.owner.bio,
  );
  TestValidator.equals(
    "owner avatar_url matches",
    retrievedCommunity.owner.avatar_url,
    community.owner.avatar_url,
  );
}
