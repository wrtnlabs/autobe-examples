import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test community moderator listing functionality.
 * 1. Admin creates community
 * 2. Admin adds two moderators
 * 3. Verify moderator list returns correct data with pagination
 */
export async function test_api_community_moderator_list_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Setup: Create member user 1 (first moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Response = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: "member123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Response);
  // 3. Setup: Create member user 2 (second moderator)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Response = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: "member123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Response);
  // 4. Setup: Admin creates community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 5. Setup: Add member 1 as moderator
  const moderator1 =
    await generate_random_reddit_platform_member_communities_moderators_add(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: member1Response.id,
        },
      },
    );
  typia.assert(moderator1);
  // 6. Setup: Add member 2 as moderator
  const moderator2 =
    await generate_random_reddit_platform_member_communities_moderators_add(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: member2Response.id,
        },
      },
    );
  typia.assert(moderator2);
  // 7. Test: List moderators (default sorting)
  const defaultPage =
    await api.functional.redditPlatform.admin.communities.moderators.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          limit: 10,
          cursor: undefined,
        },
      },
    );
  typia.assert(defaultPage);
  // 8. Validate: Default sorting (created_at ASC), pagination metadata, data count
  TestValidator.equals(
    "default page returns 2 moderators",
    defaultPage.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records count",
    defaultPage.pagination.records,
    2,
  );
  TestValidator.equals("pagination limit", defaultPage.pagination.limit, 10);
  TestValidator.equals(
    "pagination current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total pages",
    defaultPage.pagination.pages,
    1,
  );
  // 9. Validate: Moderator user references contain complete profile data
  const moderatorUser1 = defaultPage.data.find(
    (m) => m.user.id === member1Response.id,
  );
  const moderatorUser2 = defaultPage.data.find(
    (m) => m.user.id === member2Response.id,
  );
  TestValidator.equals(
    "moderator 1 user profile includes username",
    moderatorUser1?.user.username,
    member1Response.username,
  );
  TestValidator.equals(
    "moderator 1 user profile includes display_name",
    moderatorUser1?.user.displayName,
    member1Response.displayName,
  );
  TestValidator.equals(
    "moderator 1 user profile includes karma_score",
    moderatorUser1?.user.karmaScore,
    member1Response.karmaScore,
  );
  // 10. Test: Filter by specific user_id
  const filteredPage =
    await api.functional.redditPlatform.admin.communities.moderators.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          user_id: member1Response.id,
        },
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered page returns 1 moderator",
    filteredPage.data.length,
    1,
  );
  TestValidator.equals(
    "filtered user matches",
    filteredPage.data[0].user.id,
    member1Response.id,
  );
  // 11. Test: Sorting by user_id DESC
  const sortDescPage =
    await api.functional.redditPlatform.admin.communities.moderators.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          sort_by: "user_id",
          sort_order: "DESC",
        },
      },
    );
  typia.assert(sortDescPage);
  TestValidator.equals(
    "user_id DESC returns 2 moderators",
    sortDescPage.data.length,
    2,
  );
  // 12. Test: Sorting by id DESC
  const idSortDescPage =
    await api.functional.redditPlatform.admin.communities.moderators.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          sort_by: "id",
          sort_order: "DESC",
        },
      },
    );
  typia.assert(idSortDescPage);
  TestValidator.equals(
    "id DESC returns 2 moderators",
    idSortDescPage.data.length,
    2,
  );
  // 13. Validate: Community isolation (only moderators from this community)
  const allModerators = defaultPage.data;
  for (const moderator of allModerators) {
    TestValidator.equals(
      "moderator belongs to correct community",
      moderator.community.id,
      community.id,
    );
  }
}
