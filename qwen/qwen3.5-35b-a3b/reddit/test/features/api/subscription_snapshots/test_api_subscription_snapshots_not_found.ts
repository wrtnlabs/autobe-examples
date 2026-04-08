import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_snapshots_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditCommunityMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Generate invalid subscription ID (random UUID that won't exist)
  const invalidSubscriptionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test that non-existent subscription returns 404 error
  // Use TestValidator.httpError to validate the 404 status code
  await TestValidator.httpError(
    "should return 404 for non-existent subscription",
    404,
    async () => {
      await api.functional.redditCommunity.member.subscriptions.snapshots.index(
        memberConnection,
        {
          subscriptionId: invalidSubscriptionId,
          body: typia.random<IRedditCommunitySubscription.ISnapshotRequest>(),
        },
      );
    },
  );
}
