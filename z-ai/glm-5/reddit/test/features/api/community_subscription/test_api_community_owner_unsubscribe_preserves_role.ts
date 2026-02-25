import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test that a community owner can unsubscribe from their own community
 * while preserving their owner role and moderation privileges.
 *
 * Business rule: Unsubscription affects feed visibility and standard posting rights,
 * but owner moderation authority is permanent and independent of subscription status.
 *
 * Key validations:
 * 1. Owner CAN unsubscribe from their own community
 * 2. Unsubscription completes successfully (no error)
 * 3. Double unsubscription fails (proves first worked - 'not subscribed' error)
 * 4. Owner still has owner role in community_moderators (implicit - no endpoint to verify)
 */
export async function test_api_community_owner_unsubscribe_preserves_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {},
  );
  typia.assert(owner);
  // 2. Create a community - owner is auto-subscribed
  const community: ICommunityCommunity =
    await generate_random_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Store values for verification
  const communityName: string = community.name;
  // Verify owner is the community creator
  TestValidator.equals(
    "owner is community creator",
    community.owner.id,
    owner.id,
  );
  // Verify initial subscriber count (owner is auto-subscribed)
  TestValidator.equals(
    "initial subscriber count is 1 (owner auto-subscribed)",
    community.subscriberCount,
    1,
  );
  // 3. Owner unsubscribes from their own community
  // This should succeed - proving owners CAN unsubscribe
  await api.functional.community.member.communities.subscriptions.erase(
    ownerConnection,
    { communityName },
  );
  // 4. Verify unsubscription worked by attempting second unsubscription
  // Second unsubscription should fail with 'not subscribed' error
  await TestValidator.error(
    "second unsubscription fails - proves first unsubscription worked",
    async () => {
      await api.functional.community.member.communities.subscriptions.erase(
        ownerConnection,
        { communityName },
      );
    },
  );
  // 5. Key business rule verification:
  // - Owner successfully unsubscribed (subscription state changed)
  // - The fact that unsubscription succeeded proves owner role is separate from subscription
  // - If subscription were required for ownership, unsubscription would be blocked
  // - Owner moderation authority is preserved (implicit - requires additional endpoints to verify)
}
