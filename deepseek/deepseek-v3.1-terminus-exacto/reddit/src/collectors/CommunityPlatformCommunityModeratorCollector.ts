import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityModeratorCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityModerator.ICreate;
    communityPlatformCommunities: IEntity;
    communityPlatformUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      assigned_at: new Date(),
      role_level: props.body.role_level,
      is_active: true,
      assigned_by_user_id: props.communityPlatformUsers.id,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      user: { connect: { id: props.body.user_id } },
      community: { connect: { id: props.communityPlatformCommunities.id } },
    } satisfies Prisma.community_platform_community_moderatorsCreateInput;
  }
}
