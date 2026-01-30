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
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunitySubscription";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_community_subscription_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create two valid communities for subscription
  const community1: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  const community2: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // Step 3: Create a non-existent community ID (valid UUID format but not in system)
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Attempt to update subscriptions with mix of valid and non-existent IDs
  // The system should reject the entire request due to the non-existent community ID
  await TestValidator.error(
    "request should be rejected when any community ID does not exist",
    async () => {
      await api.functional.communityBbs.member.users.subscriptions.update(
        memberConnection,
        {
          body: {
            communityIds: [
              community1.id,
              community2.id,
              nonExistentCommunityId, // Invalid community ID
            ],
          } satisfies ICommunityBbsCommunitySubscription.IRequest,
        },
      );
    },
  );
}
