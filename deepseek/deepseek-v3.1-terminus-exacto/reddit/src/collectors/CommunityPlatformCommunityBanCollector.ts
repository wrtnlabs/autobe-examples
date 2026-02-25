import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBan.ICreate;
    communityPlatformCommunities: IEntity; // from path parameter communityId
    communityPlatformModerators: IEntity; // from authorized actor
    communityPlatformModeratorSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "active",
      banned_at: new Date(),
      expires_at: props.body.expires_at ?? null,
      revoked_at: null,
      revoke_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      community: { connect: { id: props.communityPlatformCommunities.id } },
      user: { connect: { id: props.body.user_id } },
      moderator: { connect: { id: props.communityPlatformModerators.id } },
      // HasMany relation
      moderationAuditLogs: undefined,
    } satisfies Prisma.community_platform_community_bansCreateInput;
  }
}
