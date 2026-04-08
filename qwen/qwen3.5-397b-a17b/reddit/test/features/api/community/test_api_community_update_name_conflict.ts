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
 * Test community name uniqueness validation during update operations.
 *
 * Validates that the system enforces unique community names across the platform when updating community metadata. The test creates two communities with distinct names, then attempts to update the second community's name to match the first community's name, expecting a 409 Conflict error.
 *
 * This test ensures that the business rule requiring unique community names is properly enforced at the API level, preventing naming collisions that could cause confusion in community identification and URL routing.
 *
 * 1. Member authenticates via registration to obtain valid session token.
 * 2. Member creates first community with name 'CommunityA'.
 * 3. Member creates second community with name 'CommunityB'.
 * 4. Member attempts to update second community's name to 'CommunityA'.
 * 5. System rejects update with 409 Conflict due to name uniqueness violation.
 * 6. Update operation throws error confirming name conflict detection.
 */
export async function test_api_community_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create first community with name 'CommunityA'
  const communityA =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "CommunityA",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(communityA);
  TestValidator.equals("first community name", communityA.name, "CommunityA");
  // 3. Create second community with name 'CommunityB'
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "CommunityB",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(communityB);
  TestValidator.equals("second community name", communityB.name, "CommunityB");
  // 4. Attempt to update second community's name to 'CommunityA' (should fail with 409)
  await TestValidator.error("name conflict error", async () => {
    await api.functional.redditCommunity.member.communities.update(
      memberConnection,
      {
        communityId: communityB.id,
        body: {
          name: "CommunityA",
          description: communityB.description,
          icon: communityB.icon,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  });
}
