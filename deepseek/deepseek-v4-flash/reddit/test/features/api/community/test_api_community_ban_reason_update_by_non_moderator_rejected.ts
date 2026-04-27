import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that a non-moderator member receives a 403 Forbidden error when trying to update a community ban reason.
 *
 * A community ban's reason can only be updated by the community owner or a designated moderator. This test verifies that a regular member who has no moderation role in the community is properly rejected with a 403 status code when attempting to modify the ban reason.
 *
 * The test creates three member accounts: one who owns the community, one who gets banned, and one who attempts the unauthorized update. The ban is first created by the owner, then the non-moderator member tries to update the reason.
 *
 * 1. Join as Member A — becomes the community owner.
 * 2. Join as Member B — will be banned from the community.
 * 3. Join as Member C — a non-moderator who will attempt the unauthorized update.
 * 4. As Member A, create a new community.
 * 5. As Member A, ban Member B from the community, capturing the ban record ID.
 * 6. As Member C (no moderator role), call PUT /member/community-bans/{banId} with a new reason. Validate 403 Forbidden.
 */
export async function test_api_community_ban_reason_update_by_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as Member A (owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Join as Member B (to be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Join as Member C (non-moderator who will attempt the update)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 4. As Member A, create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 5. As Member A, ban Member B from the community
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      memberAConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: memberB.username,
          reason: "Original ban reason",
        },
      },
    );
  typia.assert(ban);
  // 6. As Member C (non-moderator), attempt to update the ban reason
  //    Expect 403 Forbidden since C has no moderator or owner role
  await TestValidator.httpError(
    "non-moderator cannot update ban reason",
    403,
    async () => {
      await api.functional.communityPlatform.member.community_bans.update(
        memberCConnection,
        {
          banId: ban.id,
          body: {
            reason: "Attempted update by non-moderator",
          } satisfies ICommunityPlatformBan.IUpdate,
        },
      );
    },
  );
}
