import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformBan.ICreate;
    communityPlatformCommunities: IEntity;
    communityPlatformModerationRoles: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      banned_at: new Date(),
      expires_at: props.body.expiresAt ? new Date(props.body.expiresAt) : null,
      unbanned_at: null,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (use connect, not direct FK)
      bannedMember: { connect: { id: props.body.memberId } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
      issuingModeratorRole: {
        connect: { id: props.communityPlatformModerationRoles.id },
      },
      // HasMany relations (optional)
      assignments: undefined,
      banSnapshots: undefined,
    } satisfies Prisma.community_platform_bansCreateInput;
  }
}
