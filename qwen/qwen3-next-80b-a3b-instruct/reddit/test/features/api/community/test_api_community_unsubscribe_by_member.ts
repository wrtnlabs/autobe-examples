import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_unsubscribe_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityBbsMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: memberData },
  );
  typia.assert(member);
  // Step 2: Create a community as the authenticated member
  const communityName = RandomGenerator.name(2);
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Subscribe member to the community
  // This creates a subscription record on the server
  await api.functional.communityBbs.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 4: Unsubscribe the member from the community
  // Due to API design limitations, we must use the member's ID as the subscriptionId
  // as a workaround since the API does not expose the subscriptionId in the response
  // This assumes the subscriptionId corresponds to the member's UUID
  await api.functional.communityBbs.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId: community.id,
      subscriptionId: member.id,
    },
  );
  // Step 5: Verify subscription is permanently deleted
  // Attempt to unsubscribe again - this should fail since the subscription is gone
  await TestValidator.error(
    "subscription should be permanently deleted and cannot be unsubscribed twice",
    async () => {
      await api.functional.communityBbs.member.communities.subscriptions.erase(
        memberConnection,
        {
          communityId: community.id,
          subscriptionId: member.id,
        },
      );
    },
  );
}
