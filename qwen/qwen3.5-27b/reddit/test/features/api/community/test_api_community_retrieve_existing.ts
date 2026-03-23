import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test retrieving an existing active community by its UUID.
 *
 * This test verifies that:
 * 1. A community can be created by an authenticated member
 * 2. The community can be retrieved publicly without authentication
 * 3. The response contains all expected fields with correct values
 * 4. The owner information is properly included
 * 5. The subscriber count reflects the owner's automatic subscription
 */
export async function test_api_community_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community using the authenticated member
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve the community using a fresh (unauthenticated) connection
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedCommunity: IRedditCloneCommunity =
    await api.functional.redditClone.communities.at(publicConnection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);
  // 4. Validate response fields
  TestValidator.equals(
    "community id matches",
    retrievedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    community.name,
  );
  // Verify optional fields
  if (community.description !== null && community.description !== undefined) {
    TestValidator.equals(
      "description matches",
      retrievedCommunity.description,
      community.description,
    );
  }
  TestValidator.equals("icon is null", retrievedCommunity.icon, null);
  // Verify subscriber count is at least 1 (owner is automatically subscribed)
  TestValidator.predicate(
    "subscriber_count is at least 1",
    retrievedCommunity.subscriber_count >= 1,
  );
  // Verify deleted_at is null (active community)
  TestValidator.equals(
    "deleted_at is null",
    retrievedCommunity.deleted_at,
    null,
  );
  // Verify owner information
  TestValidator.equals(
    "owner id matches member id",
    retrievedCommunity.owner.id,
    community.owner.id,
  );
  TestValidator.predicate(
    "owner username length valid",
    retrievedCommunity.owner.username.length >= 3 &&
      retrievedCommunity.owner.username.length <= 20,
  );
  TestValidator.predicate(
    "owner display_name length valid",
    retrievedCommunity.owner.display_name.length >= 3 &&
      retrievedCommunity.owner.display_name.length <= 50,
  );
  TestValidator.predicate(
    "owner avatar_uri is null or valid URI",
    retrievedCommunity.owner.avatar_uri === null ||
      typeof retrievedCommunity.owner.avatar_uri === "string",
  );
}
