import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a guest user can successfully retrieve detailed information about an existing community.
 *
 * This test validates:
 * 1. Member account creation and authentication
 * 2. Community creation with unique name, description, and optional icon
 * 3. Guest (unauthenticated) retrieval of community details
 * 4. Response contains all required fields with correct values
 * 5. Owner information matches the member who created the community
 * 6. Community name and description match the creation input
 */
export async function test_api_community_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community using the generation utility
  const communityCreateInput: IRedditCloneCommunity.ICreate = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon: typia.assert<(string & tags.MaxLength<80000>) | null | undefined>(typia.random<string & tags.Format<"uri">>()),
  };
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: communityCreateInput,
    },
  );
  typia.assert(community);
  // 3. Retrieve community as guest (no authentication - fresh connection without auth headers)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedCommunity = await api.functional.redditClone.communities.at(
    guestConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(retrievedCommunity);
  // 4. Verify all required fields exist and have correct types
  TestValidator.equals(
    "community id matches",
    retrievedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityCreateInput.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    communityCreateInput.description,
  );
  TestValidator.equals(
    "community icon matches",
    retrievedCommunity.icon,
    communityCreateInput.icon,
  );
  TestValidator.predicate(
    "subscriber count is at least 1",
    retrievedCommunity.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedCommunity.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active community",
    retrievedCommunity.deleted_at,
    null,
  );
  // 5. Verify owner information matches the member who created the community
  TestValidator.equals(
    "owner id matches",
    retrievedCommunity.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "owner username matches",
    retrievedCommunity.owner.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "owner display_name matches",
    retrievedCommunity.owner.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "owner karma_score is number",
    typeof retrievedCommunity.owner.karma_score === "number",
  );
  TestValidator.predicate(
    "owner created_at is valid",
    retrievedCommunity.owner.created_at.length > 0,
  );
}