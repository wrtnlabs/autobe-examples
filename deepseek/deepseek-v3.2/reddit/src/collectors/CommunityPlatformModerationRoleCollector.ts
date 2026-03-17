import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModerationRoleCollector {
  export async function collect(props: {
    body: ICommunityPlatformModerationRole.ICreate;
    communityPlatformCommunities: IEntity; // from path parameter communityId
    communityPlatformMembers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      role_type: props.body.roleType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (use connect, relation name NOT table name)
      member: { connect: { id: props.body.memberId } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
      assignedBy: { connect: { id: props.communityPlatformMembers.id } },
      // HasMany relations (not applicable for creation)
      issuedBans: undefined,
      reportDismissals: undefined,
    } satisfies Prisma.community_platform_moderation_rolesCreateInput;
  }
}
