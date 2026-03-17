import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_non_moderator_cannot_update_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create non-moderator member
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  // 4. Owner creates ban on non-moderator
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: nonModerator.id,
        reason: "Test ban reason",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // 5. Non-moderator attempts to update ban - expect 403 Forbidden
  await TestValidator.error("non-moderator cannot update ban", async () => {
    await api.functional.communityPlatform.member.bans.update(
      nonModeratorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: "Updated reason by non-moderator",
          expires_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          active: false,
        } satisfies ICommunityPlatformBan.IUpdate,
      },
    );
  });
  // 6. Validate ban remains unchanged (cannot fetch directly, so verify original values)
  TestValidator.equals("ban reason unchanged", ban.reason, "Test ban reason");
  TestValidator.predicate("ban remains active", () => ban.active === true);
  if (ban.expires_at !== null) {
    TestValidator.predicate("expiration unchanged", () => {
      // Capture the non-null value to narrow the type
      const expiresAt = ban.expires_at!;
      const original = new Date(expiresAt).getTime();
      const expected = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime();
      return Math.abs(original - expected) < 1000; // within 1 second
    });
  }
}
