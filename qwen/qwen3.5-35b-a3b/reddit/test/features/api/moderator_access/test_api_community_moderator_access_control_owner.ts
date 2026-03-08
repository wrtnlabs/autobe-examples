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

export async function test_api_community_moderator_access_control_owner(
  connection: api.IConnection,
): Promise<void> {
  // =====================================================================
  // SETUP: Create three members - owner, moderator, and unauthorized user
  // =====================================================================
  // 1. First member: community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Second member: will become moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Third member: unauthorized user (neither owner nor moderator)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(unauthorizedAuth);
  // =====================================================================
  // SCENARIO 1: Community owner creates community and lists moderators
  // =====================================================================
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: typia.random<string & tags.MaxLength<256>>(),
          icon_url: undefined,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 1. Owner adds second member as moderator
  const moderatorAppointment =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        body: {
          user_id: moderatorAuth.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAppointment);
  // 2. Owner lists moderators (should return 2 moderators: owner + appointed)
  const ownerModeratorList =
    await api.functional.redditPlatform.member.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(ownerModeratorList);
  TestValidator.equals(
    "owner sees 2 moderators",
    ownerModeratorList.data.length,
    2,
  );
  TestValidator.equals(
    "owner pagination records match data",
    ownerModeratorList.pagination.records,
    2,
  );
  // =====================================================================
  // SCENARIO 2: Moderator can also list all moderators
  // =====================================================================
  const moderatorModeratorList =
    await api.functional.redditPlatform.member.communities.moderators.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorModeratorList);
  TestValidator.equals(
    "moderator sees 2 moderators",
    moderatorModeratorList.data.length,
    2,
  );
  // =====================================================================
  // SCENARIO 3: Unauthenticated request returns 401
  // =====================================================================
  // Create a new connection without token (simulate unauthenticated request)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated request returns 401", async () => {
    await api.functional.redditPlatform.member.communities.moderators.index(
      unauthenticatedConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  });
  // =====================================================================
  // SCENARIO 4: Non-owner/non-moderator returns 403
  // =====================================================================
  // Unauthorized user tries to access owner's community moderators
  await TestValidator.error("non-owner/non-moderator returns 403", async () => {
    await api.functional.redditPlatform.member.communities.moderators.index(
      unauthorizedConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformCommunityModerator.IRequest,
      },
    );
  });
  // =====================================================================
  // VALIDATION: Verify pagination structure
  // =====================================================================
  TestValidator.equals(
    "pagination has current page",
    ownerModeratorList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () =>
      ownerModeratorList.pagination.limit > 0 &&
      ownerModeratorList.pagination.limit <= 100,
  );
  TestValidator.equals(
    "pagination has correct records count",
    ownerModeratorList.pagination.records,
    ownerModeratorList.data.length,
  );
  TestValidator.equals(
    "pagination has correct pages count",
    ownerModeratorList.pagination.pages,
    1,
  );
}
