import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_bans_moderator_view_active(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Call ban list endpoint with active filter
  const page = await api.functional.communityPlatform.member.bans.index(
    moderatorConnection,
    {
      communityId: community.id,
      body: {
        active: true,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(page);
  // Validate each ban summary structure - only business logic after typia.assert
  for (const ban of page.data) {
    typia.assert(ban);
    // Only business logic check: active filter should return active bans
    TestValidator.equals("ban is active when filtered", ban.active, true);
    // For active bans, unbanned_at should be null
    TestValidator.equals(
      "unbanned_at is null for active",
      ban.unbanned_at,
      null,
    );
  }
  // Test authorization: non-moderator should not have access
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  await TestValidator.error("non-moderator cannot view bans", async () => {
    await api.functional.communityPlatform.member.bans.index(
      nonModeratorConnection,
      {
        communityId: community.id,
        body: {
          active: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  });
}
