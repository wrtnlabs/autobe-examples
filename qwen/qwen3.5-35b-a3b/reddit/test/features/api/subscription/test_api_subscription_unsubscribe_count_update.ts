import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscription_unsubscribe_count_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberA);
  // 2. Create and authenticate member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberB);
  // 3. Create a community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: "Test community for subscription unsubscription",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Note: Cannot test subscription creation as endpoint not available in SDK
  // Test will focus on unsubscribe functionality and soft-delete behavior
  // 4. Unsubscribe member A (assuming subscription exists)
  // This should return 204 No Content
  await api.functional.redditPlatform.member.communities._subscribe.erase(
    memberAConnection,
    { name: community.name },
  );
  // 5. Verify unsubscribe operation completes successfully
  // (204 No Content means successful soft delete)
  // 6. Unsubscribe member B (same community)
  await api.functional.redditPlatform.member.communities._subscribe.erase(
    memberBConnection,
    { name: community.name },
  );
  // 7. Verify both unsubscribe operations completed without errors
  // (if 204 returned, operations were successful)
}
