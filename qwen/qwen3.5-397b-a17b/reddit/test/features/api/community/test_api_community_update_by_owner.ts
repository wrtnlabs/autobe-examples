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

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member who will own the community
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
  // 2. Create a community with initial name and description
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: initialDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Store original updated_at for comparison
  const originalUpdatedAt = community.updated_at;
  // 3. Update the community description
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
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
  // 4. Verify the response contains the updated description
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updatedDescription,
  );
  // 5. Verify the updated_at timestamp has changed from the original
  TestValidator.notEquals(
    "updated_at changed",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate("updated_at is later than original", () => {
    return (
      new Date(updatedCommunity.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime()
    );
  });
  // 6. Verify all other community fields remain unchanged
  TestValidator.equals("name unchanged", updatedCommunity.name, community.name);
  TestValidator.equals(
    "owner unchanged",
    updatedCommunity.owner.id,
    community.owner.id,
  );
  TestValidator.equals(
    "owner username unchanged",
    updatedCommunity.owner.username,
    community.owner.username,
  );
  TestValidator.equals(
    "subscriber_count unchanged",
    updatedCommunity.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals("id unchanged", updatedCommunity.id, community.id);
}
