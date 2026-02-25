import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_community_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new community as admin first
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
      username: "admin_user",
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(admin);
  // 3. Subscribe to the community as the member
  const subscription =
    await api.functional.redditClone.member.communities.subscribers.subscribe(
      memberConnection,
      {
        communityId: admin.id, // Using admin ID as community identifier for simplicity
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription
  TestValidator.equals("member_id matches", subscription.member_id, member.id);
  TestValidator.equals(
    "community_id matches",
    subscription.community_id,
    admin.id,
  );
  // 5. Test duplicate subscription (should return 409 Conflict)
  await TestValidator.error("duplicate subscription", async () => {
    await api.functional.redditClone.member.communities.subscribers.subscribe(
      memberConnection,
      {
        communityId: admin.id,
      },
    );
  });
}
