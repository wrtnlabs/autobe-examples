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

export async function test_api_community_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 2. Create first community (Community A)
  const communityA = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_a_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: typia.assert<(string & tags.MaxLength<80000>) | null>(typia.random<string & tags.Format<"uri">>()),
      },
    },
  );
  typia.assert(communityA);
  // 3. Create second community (Community B)
  const communityB = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_b_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      },
    },
  );
  typia.assert(communityB);
  // Store original names for verification
  const originalCommunityAName = communityA.name;
  const originalCommunityBName = communityB.name;
  const originalCommunityAUpdatedAt = communityA.updated_at;
  // 4. Attempt to update Community A's name to match Community B's name
  // This should fail with 409 Conflict due to name uniqueness constraint
  await TestValidator.error("community name uniqueness conflict", async () => {
    await api.functional.redditClone.communities.update(memberConnection, {
      communityId: communityA.id,
      body: {
        name: communityB.name,
      } satisfies IRedditCloneCommunity.IUpdate,
    });
  });
  // 5. Verify Community A retained its original name (stored in memory)
  TestValidator.equals(
    "Community A name unchanged after failed update",
    communityA.name,
    originalCommunityAName,
  );
  // 6. Verify Community B name remains unchanged
  TestValidator.equals(
    "Community B name unchanged",
    communityB.name,
    originalCommunityBName,
  );
  // 7. Verify the updated_at timestamp was not modified by the failed update
  // Since the update failed, the community object in memory still has original timestamp
  TestValidator.equals(
    "Community A updated_at unchanged after failed update",
    communityA.updated_at,
    originalCommunityAUpdatedAt,
  );
}