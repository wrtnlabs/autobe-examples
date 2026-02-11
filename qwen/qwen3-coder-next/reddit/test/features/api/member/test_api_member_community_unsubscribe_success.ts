import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommon";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member successfully unsubscribing from a community they are subscribed to.
 * 1. Authenticate as member
 * 2. Subscribe to a community using a generated UUID
 * 3. Unsubscribe from the community
 * 4. Verify the operation returns a success message
 */
export async function test_api_member_community_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(2),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberProfile);
  // 2. Generate a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Subscribe to the community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: communityId,
    },
  );
  // 4. Unsubscribe from the community
  const result =
    await api.functional.redditPlatform.member.communities.subscriptions.erase(
      memberConnection,
      {
        communityId: communityId,
      },
    );
  typia.assert(result!);
  TestValidator.equals(
    "unsubscribe success message",
    result.message.toLowerCase(),
    "unsubscribed",
  );
}
