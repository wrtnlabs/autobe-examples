import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_subscription_toggle_subscribe(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Toggle subscription to true
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.toggle(
      memberConnection,
      {
        communityId,
        body: {
          subscribed: true,
        },
      },
    );
  typia.assert(subscription);
  // 3. Validate active subscription (deleted_at null)
  TestValidator.equals(
    "subscription should be active",
    subscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "community should exist",
    !!subscription.community,
    true,
  );
  TestValidator.equals("user should exist", !!subscription.user, true);
}
