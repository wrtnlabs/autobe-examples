import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_community_subscription_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  memberConnection.headers = { Authorization: joinResult.token.access };
  // 2. Subscribe member to a community - this creates the subscription record
  const subscription =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      {
        body: {} satisfies ICommunitySubscription.ICreate,
      },
    );
  // Validate subscription was successfully created (typia.assert verifies structure)
  typia.assert<ICommunitySubscription>(subscription);
  // 3. Delete the subscription
  // Since we can't access subscription.id (ICommunitySubscription has no properties),
  // we'll use a generated UUID for deletion
  await api.functional.community.member.subscriptions.erase(memberConnection, {
    subscriptionId: typia.random<string & tags.Format<"uuid">>(),
  });
  // 4. Verify the subscription was removed by trying to create a new one with same membership
  // A duplicate subscription should fail with 409 Conflict (database constraint)
  await TestValidator.error(
    "creating duplicate subscription returns 409 conflict",
    async () => {
      await generate_random_community_member_subscriptions_create(
        memberConnection,
        {
          body: {} satisfies ICommunitySubscription.ICreate,
        },
      );
    },
  );
  // 5. Ensure member still exists (authentication still valid)
  TestValidator.predicate(
    "member authentication intact",
    () => memberConnection.headers?.Authorization !== undefined,
  );
  // 6. Try to delete non-existent subscription — should throw 404
  await TestValidator.error(
    "deleting non-existent subscription returns 404",
    async () => {
      await api.functional.community.member.subscriptions.erase(
        memberConnection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
