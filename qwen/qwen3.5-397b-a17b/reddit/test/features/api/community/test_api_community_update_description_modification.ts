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

/**
 * Test community description update functionality.
 *
 * This test validates that community owners can update their community's description.
 * The test workflow:
 * 1. Register a new member account who will own the community
 * 2. Create a community with an initial description
 * 3. Update the community description with new content (longer text, special characters)
 * 4. Verify the updated description is saved and returned correctly
 * 5. Verify the updated_at timestamp reflects the modification time
 * 6. Test multiple description updates to ensure each update is properly recorded
 */
export async function test_api_community_update_description_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: initialDescription,
        },
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "initial description matches",
    community.description,
    initialDescription,
  );
  // 3. Update community description with new content
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedCommunity =
    await api.functional.redditCommunity.member.communities.update(
      memberConnection,
      {
        communityName: community.name,
        body: {
          description: updatedDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Verify the updated description is saved correctly
  TestValidator.equals(
    "updated description matches",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "description changed",
    community.description,
    updatedCommunity.description,
  );
  // 5. Verify the updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedCommunity.updated_at) >
      new Date(updatedCommunity.created_at),
  );
  TestValidator.predicate(
    "updated_at reflects recent update",
    new Date(updatedCommunity.updated_at) >= new Date(community.updated_at),
  );
  // 6. Test another description update to ensure multiple updates work
  const secondUpdateDescription = RandomGenerator.paragraph({ sentences: 5 });
  const secondUpdatedCommunity =
    await api.functional.redditCommunity.member.communities.update(
      memberConnection,
      {
        communityName: community.name,
        body: {
          description: secondUpdateDescription,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(secondUpdatedCommunity);
  TestValidator.equals(
    "second update description matches",
    secondUpdatedCommunity.description,
    secondUpdateDescription,
  );
  TestValidator.notEquals(
    "second update differs from first",
    secondUpdatedCommunity.description,
    updatedCommunity.description,
  );
  TestValidator.predicate(
    "second updated_at is after first updated_at",
    new Date(secondUpdatedCommunity.updated_at) >
      new Date(updatedCommunity.updated_at),
  );
}
