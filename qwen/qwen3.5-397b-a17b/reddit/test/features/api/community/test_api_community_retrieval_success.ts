import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
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

/**
 * Test the primary success path for retrieving a specific community's detailed information.
 *
 * Validates the complete community retrieval flow including member authentication, community creation, and detailed community information retrieval. Ensures that the community response includes all required fields with correct data types and values.
 *
 * Special attention is given to verifying that the owner field correctly references the community creator's public profile information, and that the deleted_at field is null for active communities.
 *
 * 1. Member registers with email, password, and username.
 * 2. Member creates a community with name, description, and icon.
 * 3. Retrieve the community using its ID.
 * 4. Validates community details match input and include all required fields: id, name, description, icon, owner, subscriber_count, created_at, updated_at, and deleted_at.
 */
export async function test_api_community_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve community by ID
  const retrieved = await api.functional.redditCommunity.communities.at(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate community details
  TestValidator.equals("community id", retrieved.id, community.id);
  TestValidator.equals("community name", retrieved.name, community.name);
  TestValidator.equals(
    "community description",
    retrieved.description,
    community.description,
  );
  TestValidator.equals("community icon", retrieved.icon, community.icon);
  TestValidator.equals("owner id", retrieved.owner.id, memberAuth.id);
  TestValidator.equals(
    "owner username",
    retrieved.owner.username,
    memberAuth.username,
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
  TestValidator.predicate(
    "subscriber_count is non-negative",
    retrieved.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrieved.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrieved.updated_at).getTime() > 0,
  );
}
