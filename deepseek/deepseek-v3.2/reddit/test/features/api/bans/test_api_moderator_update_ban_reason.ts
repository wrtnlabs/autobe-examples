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
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderator_update_ban_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator member connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // Create banned member connection
  const bannedConnection: api.IConnection = { host: connection.host };
  const banned = await authorize_member_join(bannedConnection, {});
  typia.assert(banned);
  // Moderator creates a community (automatically becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {} satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
    );
  typia.assert(community);
  // Moderator creates initial ban on banned member
  const initialBan =
    await generate_random_community_platform_member_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id satisfies string as string },
        body: {
          memberId: banned.id satisfies string as string,
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 3,
          }),
        } satisfies DeepPartial<ICommunityPlatformBan.ICreate>,
      },
    );
  typia.assert(initialBan);
  // Prepare update with new reason
  const newReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 1,
    sentenceMax: 3,
  });
  const updateBody = {
    reason: newReason,
  } satisfies ICommunityPlatformBan.IUpdate;
  // Moderator updates the ban reason
  const updatedBan = await api.functional.communityPlatform.member.bans.update(
    moderatorConnection,
    {
      communityId: community.id satisfies string as string &
        tags.Format<"uuid">,
      banId: initialBan.id satisfies string as string & tags.Format<"uuid">,
      body: updateBody,
    },
  );
  typia.assert(updatedBan);
  // Validate ban update
  TestValidator.equals("ban id unchanged", updatedBan.id, initialBan.id);
  TestValidator.equals(
    "banned member unchanged",
    updatedBan.bannedMember.id,
    banned.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator role unchanged",
    updatedBan.issuingModeratorRole.id,
    initialBan.issuingModeratorRole.id,
  );
  TestValidator.equals("reason updated", updatedBan.reason, newReason);
  TestValidator.predicate("active remains true", updatedBan.active === true);
  TestValidator.equals(
    "banned_at unchanged",
    updatedBan.banned_at,
    initialBan.banned_at,
  );
  TestValidator.equals(
    "expires_at unchanged",
    updatedBan.expires_at,
    initialBan.expires_at,
  );
  TestValidator.equals(
    "unbanned_at remains null",
    updatedBan.unbanned_at,
    null,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBan.created_at,
    initialBan.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer or equal",
    new Date(updatedBan.updated_at) >= new Date(initialBan.updated_at),
  );
}
