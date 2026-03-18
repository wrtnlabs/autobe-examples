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
    communityPlatformCommunities: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      role_type: props.body.roleType,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      community: {
        connect: {
          id: props.communityPlatformCommunities.id,
        },
      },
      member: {
        connect: {
          id: props.body.communityPlatformMemberId,
        },
      },
    } satisfies Prisma.community_platform_moderation_rolesCreateInput;
  }
}
