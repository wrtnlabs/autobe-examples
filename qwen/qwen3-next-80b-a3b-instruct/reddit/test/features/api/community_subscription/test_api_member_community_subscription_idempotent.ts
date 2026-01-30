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
export async function test_api_member_community_subscription_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a community to subscribe to
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: First subscription request
  const firstResponse =
    await api.functional.communityBbs.member.users.subscriptions.update(
      memberConnection,
      {
        body: {
          communityIds: [community.id] satisfies (string &
            tags.Format<"uuid">)[] &
            tags.MinItems<1> &
            tags.MaxItems<100>,
        } satisfies ICommunityBbsCommunitySubscription.IRequest,
      },
    );
  typia.assert(firstResponse);
  TestValidator.equals(
    "first subscription response should have one item",
    firstResponse.data.length,
    1,
  );
  TestValidator.equals(
    "first subscription community ID should match created community",
    firstResponse.data[0].community_id,
    community.id,
  );
  // Step 4: Second identical subscription request (idempotent operation)
  const secondResponse =
    await api.functional.communityBbs.member.users.subscriptions.update(
      memberConnection,
      {
        body: {
          communityIds: [community.id] satisfies (string &
            tags.Format<"uuid">)[] &
            tags.MinItems<1> &
            tags.MaxItems<100>,
        } satisfies ICommunityBbsCommunitySubscription.IRequest,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "second subscription response should have one item",
    secondResponse.data.length,
    1,
  );
  TestValidator.equals(
    "second subscription community ID should match created community",
    secondResponse.data[0].community_id,
    community.id,
  );
  // Step 5: Validate idempotency by comparing responses
  // Since both requests yield the same state (one subscription to same community), it's idempotent
  TestValidator.equals(
    "first and second subscription responses should be identical",
    firstResponse,
    secondResponse,
  );
}
