import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_community_bans_create } from "../../../generate/generate_random_community_platform_member_community_bans_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that an appointed moderator can update the reason text of an existing community ban.
 *
 * Validates the complete workflow from community creation through moderator appointment, ban creation, and ban reason update. Ensures that a moderator who did not create the community (but was appointed) has the authority to update ban reasons.
 *
 * 1. Member A joins → becomes community owner.
 * 2. Member B joins → will be appointed as moderator.
 * 3. Member C joins → will be banned.
 * 4. Member A creates a community.
 * 5. Member A appoints Member B as a moderator.
 * 6. Member B bans Member C with an initial reason.
 * 7. Member B updates the ban reason via PUT /communityPlatform/member/community-bans/{banId}.
 * 8. Validates the reason text is updated and updated_at reflects the change.
 */
export async function test_api_community_ban_reason_update_by_appointed_moderator(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Create actor-specific connections and join members
  //----
  const ownerConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  const bannedConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const moderator: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  const banned: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(bannedConnection, {});
  typia.assert(banned);
  //----
  // 2. Member A (owner) creates a community
  //----
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  //----
  // 3. Member A (owner) appoints Member B as moderator
  //----
  const moderatorAssignment: ICommunityPlatformModerator =
    await generate_random_community_platform_member_moderators_create(
      ownerConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: moderator.username,
        },
      },
    );
  typia.assert(moderatorAssignment);
  //----
  // 4. Member B (moderator) bans Member C
  //----
  const originalReason: string = "Violation of community guidelines";
  const ban: ICommunityPlatformCommunityBan =
    await generate_random_community_platform_member_community_bans_create(
      moderatorConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: banned.username,
          reason: originalReason,
        },
      },
    );
  typia.assert(ban);
  //----
  // 5. Member B (moderator) updates the ban reason
  //----
  const newReason: string = "Updated: repeated violations after warning";
  const updatedBan: ICommunityPlatformBan =
    await api.functional.communityPlatform.member.community_bans.update(
      moderatorConnection,
      {
        banId: ban.id,
        body: {
          reason: newReason,
        } satisfies ICommunityPlatformBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  //----
  // 6. Validate
  //----
  TestValidator.equals("ban reason updated", updatedBan.reason, newReason);
  TestValidator.predicate(
    "updated_at is newer than original",
    new Date(updatedBan.updated_at).getTime() >
      new Date(ban.updated_at).getTime(),
  );
}
