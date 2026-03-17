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

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will own the community
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
  // 2. Create initial community
  const initialCommunity =
    await generate_random_reddit_clone_communities_create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        icon: typia.random<string & tags.MaxLength<80000>>(),
      },
    });
  typia.assert(initialCommunity);
  // Store initial values for comparison
  const initialCreatedAt = initialCommunity.created_at;
  const initialSubscriberCount = initialCommunity.subscriber_count;
  const initialOwnerId = initialCommunity.owner.id;
  const initialUpdatedAt = initialCommunity.updated_at;
  // 3. Update community with new values
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedIcon = typia.random<string & tags.Format<"uri">>();
  const updatedCommunity = await api.functional.redditClone.communities.update(
    memberConnection,
    {
      communityId: initialCommunity.id,
      body: {
        name: updatedName,
        description: updatedDescription,
        icon: updatedIcon,
      } satisfies IRedditCloneCommunity.IUpdate,
    },
  );
  typia.assert(updatedCommunity);
  // 4. Verify updated values are reflected
  TestValidator.equals("name updated", updatedCommunity.name, updatedName);
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals("icon updated", updatedCommunity.icon, updatedIcon);
  // 5. Verify updated_at timestamp has been refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    updatedCommunity.updated_at > initialUpdatedAt,
  );
  // 6. Verify system-managed fields remain unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedCommunity.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "subscriber_count unchanged",
    updatedCommunity.subscriber_count,
    initialSubscriberCount,
  );
  TestValidator.equals(
    "owner unchanged",
    updatedCommunity.owner.id,
    initialOwnerId,
  );
  TestValidator.equals(
    "id unchanged",
    updatedCommunity.id,
    initialCommunity.id,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedCommunity.deleted_at,
    initialCommunity.deleted_at,
  );
}
