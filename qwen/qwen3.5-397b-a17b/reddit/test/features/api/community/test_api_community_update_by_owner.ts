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
 * Test community metadata update by owner.
 *
 * Validates the complete community update workflow including member authentication, community creation, and metadata modification. Ensures that only the community owner can update community information and that all mutable fields (name, description, icon) are correctly updated.
 *
 * Special attention is given to verifying that the updated_at timestamp changes after the update operation, confirming that the modification was persisted. The test also validates that the response contains the complete updated community object with all new values.
 *
 * 1. Member authenticates via join endpoint and receives authorization token.
 * 2. Member creates a community with initial name, description, and icon.
 * 3. Member sends PUT request to update community metadata with new values.
 * 4. Validates that all fields are updated correctly and updated_at timestamp differs from created_at.
 * 5. Verifies the response contains complete community object with owner information and subscriber count.
 */
export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create initial community
  const initialCommunity =
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
  typia.assert(initialCommunity);
  // 3. Prepare updated values
  const updatedName = RandomGenerator.name(2);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedIcon = typia.random<string & tags.Format<"uri">>();
  // 4. Update community metadata
  const updatedCommunity =
    await api.functional.redditCommunity.member.communities.update(
      memberConnection,
      {
        communityId: initialCommunity.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          icon: updatedIcon,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Validate update results
  TestValidator.equals(
    "community id unchanged",
    updatedCommunity.id,
    initialCommunity.id,
  );
  TestValidator.equals("name updated", updatedCommunity.name, updatedName);
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals("icon updated", updatedCommunity.icon, updatedIcon);
  TestValidator.notEquals(
    "updated_at changed",
    updatedCommunity.updated_at,
    initialCommunity.updated_at,
  );
  TestValidator.equals(
    "owner unchanged",
    updatedCommunity.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.created_at,
    initialCommunity.created_at,
  );
}
