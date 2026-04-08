import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecord";
import type { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
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

export async function test_api_bans_index_moderator_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create target user account to be banned
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUserAuth = await authorize_member_join(targetUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetUserAuth);
  // 3. Moderator creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<50> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Moderator bans the target user from the community
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: targetUserAuth.id,
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 2,
          }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banRecord);
  // 5. Moderator retrieves ban records
  const banList = await api.functional.redditPlatform.member.bans.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 10,
        community_id: community.id,
      } satisfies IRedditPlatformBanRecord.IRequest,
    },
  );
  typia.assert(banList);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    banList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", banList.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    banList.pagination.records,
    1,
  );
  TestValidator.equals("pagination pages count", banList.pagination.pages, 1);
  // 7. Validate ban record structure
  const bans = banList.data;
  TestValidator.equals("ban list contains one record", bans.length, 1);
  const ban = bans[0];
  typia.assert(ban);
  // 8. Validate ban record fields
  TestValidator.equals("ban id matches", ban.id, banRecord.id);
  TestValidator.equals("ban user id matches", ban.user.id, targetUserAuth.id);
  TestValidator.equals(
    "ban community id matches",
    ban.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned_by user id matches moderator",
    ban.banned_by.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "ban reason is set",
    ban.reason.length,
    banRecord.reason.length,
  );
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals(
    "unbanned_at is null for active ban",
    ban.unbanned_at,
    null,
  );
  TestValidator.equals(
    "banned_at matches ban creation time",
    ban.banned_at,
    banRecord.banned_at,
  );
  // 9. Validate user summary fields
  const targetUser = ban.user;
  typia.assert(targetUser);
  TestValidator.equals("user id matches", targetUser.id, targetUserAuth.id);
  TestValidator.equals(
    "user username matches",
    targetUser.username,
    targetUserAuth.username,
  );
  TestValidator.predicate("user karma is non-negative", targetUser.karma >= 0);
  // 10. Validate community summary fields
  const banCommunity = ban.community;
  typia.assert(banCommunity);
  TestValidator.equals("community id matches", banCommunity.id, community.id);
  TestValidator.equals(
    "community name matches",
    banCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community owner id matches",
    banCommunity.owner.id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "community subscribers count is non-negative",
    banCommunity.subscriber_count >= 0,
  );
  TestValidator.equals(
    "community deleted_at is null",
    banCommunity.deleted_at,
    null,
  );
}