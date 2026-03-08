import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityModerator";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_moderator_list_success(
  connection: api.IConnection,
) {
  // 1. Setup: Create a member user who will be the community owner
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const adminUser = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create another member user who will be appointed as moderator
  const userConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUser = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorUser);
  // 3. Admin creates a community
  const adminUserConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(adminUserConnection, {
    body: {
      email: adminUser.email,
      password: password,
    },
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminUserConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Admin appoints the second user as moderator
  const moderatorAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      adminUserConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderatorUser.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);
  // 5. Get moderators list (first page)
  const firstPage =
    await api.functional.redditPlatform.member.communities.moderators.index(
      adminUserConnection,
      {
        communityId: community.id,
        body: {
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(firstPage);
  // 6. Validate first page response
  TestValidator.equals("has data", firstPage.data.length, 1);
  TestValidator.equals("page current", firstPage.pagination.current, 1);
  TestValidator.equals("page limit", firstPage.pagination.limit, 20);
  TestValidator.equals("page records", firstPage.pagination.records, 1);
  TestValidator.equals("page pages", firstPage.pagination.pages, 1);
  // 7. Validate moderator summary structure
  const moderator = firstPage.data[0];
  TestValidator.equals("moderator has id", moderator.id !== undefined, true);
  TestValidator.equals(
    "moderator has community",
    moderator.community.id !== undefined,
    true,
  );
  TestValidator.equals(
    "moderator has user",
    moderator.user.id !== undefined,
    true,
  );
  TestValidator.equals(
    "moderator has created_at",
    moderator.created_at !== undefined,
    true,
  );
  // 8. Validate user profile data is correctly joined
  TestValidator.equals(
    "user username matches",
    moderator.user.username,
    moderatorUser.username,
  );
  TestValidator.equals("user id matches", moderator.user.id, moderatorUser.id);
  TestValidator.equals(
    "display name present",
    moderator.user.displayName.length,
    0,
  );
  TestValidator.predicate(
    "user has karma score",
    moderatorUser.karmaScore >= 0,
  );
  TestValidator.predicate(
    "has valid created_at",
    moderator.created_at.length > 0,
  );
  // 9. Test filtering by user_id
  const filteredPage =
    await api.functional.redditPlatform.member.communities.moderators.index(
      adminUserConnection,
      {
        communityId: community.id,
        body: {
          user_id: moderatorUser.id,
          page: 1,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals("filtered page has data", filteredPage.data.length, 1);
  TestValidator.equals(
    "filtered user matches",
    filteredPage.data[0].user.id,
    moderatorUser.id,
  );
  // 10. Add a second moderator to test ordering and pagination
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModeratorPassword = RandomGenerator.alphaNumeric(16);
  const secondModeratorUser = await authorize_member_join(
    secondModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: secondModeratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(secondModeratorUser);
  // Add second moderator
  const secondModeratorAppointment =
    await api.functional.redditPlatform.member.communities.moderators.add(
      adminUserConnection,
      {
        communityId: community.id,
        body: {
          user_id: secondModeratorUser.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAppointment);
  // 11. Test ordering: oldest first (ASC default)
  const ascPage =
    await api.functional.redditPlatform.member.communities.moderators.index(
      adminUserConnection,
      {
        communityId: community.id,
        body: {
          sort_by: "created_at",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.equals("asc page has 2 moderators", ascPage.data.length, 2);
  TestValidator.equals(
    "first moderator is oldest",
    ascPage.data[0].id,
    moderatorAppointment.id,
  );
  // 12. Test ordering: newest first (DESC)
  const descPage =
    await api.functional.redditPlatform.member.communities.moderators.index(
      adminUserConnection,
      {
        communityId: community.id,
        body: {
          sort_by: "created_at",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.equals("desc page has 2 moderators", descPage.data.length, 2);
  TestValidator.equals(
    "first moderator is newest",
    descPage.data[0].id,
    secondModeratorAppointment.id,
  );
}
