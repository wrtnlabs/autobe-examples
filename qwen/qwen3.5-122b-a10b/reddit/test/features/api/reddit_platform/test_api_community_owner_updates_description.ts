import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_owner_updates_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new community as that member (who becomes owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Store original values for comparison
  const originalDescription = community.description;
  const originalUpdatedAt = community.updatedAt;
  const originalSubscriberCount = community.subscriberCount;
  // 3. Update community with new description
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedCommunity =
    await api.functional.redditPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          description: newDescription,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 4. Verify the response contains the updated community with the new description
  TestValidator.equals(
    "description updated",
    updatedCommunity.description,
    newDescription,
  );
  // 5. Verify the updated_at timestamp has changed
  TestValidator.notEquals(
    "updatedAt changed",
    updatedCommunity.updatedAt,
    originalUpdatedAt,
  );
  // 6. Verify the subscriber_count remains unchanged
  TestValidator.equals(
    "subscriber count unchanged",
    updatedCommunity.subscriberCount,
    originalSubscriberCount,
  );
  // 7. Verify owner remains the same
  TestValidator.equals("owner unchanged", updatedCommunity.owner.id, member.id);
}