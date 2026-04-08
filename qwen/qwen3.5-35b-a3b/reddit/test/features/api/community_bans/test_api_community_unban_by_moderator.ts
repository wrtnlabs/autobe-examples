import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
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
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner (moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: "owner_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Authenticate as banned user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: "user_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(userAuthorized);
  // 3. Create community with owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: "test_community_" + RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create ban record for the user
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          user_id: userAuthorized.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Verify ban was created successfully
  TestValidator.equals(
    "ban record has correct user_id",
    banRecord.user.id,
    userAuthorized.id,
  );
  TestValidator.equals(
    "ban record has correct community",
    banRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban record has reason",
    banRecord.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "ban record has banned_at timestamp",
    banRecord.banned_at !== null,
    true,
  );
  TestValidator.equals(
    "ban record has null unbanned_at initially",
    banRecord.unbanned_at,
    null,
  );
  // 6. Perform unban operation via DELETE endpoint
  await api.functional.redditPlatform.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: userAuthorized.id,
    },
  );
  // 7. Verify unban operation completed without errors
  // The ban record exists in audit trail but unbanned_at cannot be verified directly
  // as the DELETE endpoint returns void and there's no GET bans endpoint
  TestValidator.predicate("unban operation completed without throwing", true);
}
