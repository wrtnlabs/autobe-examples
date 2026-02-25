import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBannedUserCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBannedUser.ICreate;
    communityPlatformCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      banned_at: new Date(props.body.banned_at),
      unbanned_at: null,
      ban_reason: props.body.ban_reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
      user: { connect: { id: props.body.user_id } },
    } satisfies Prisma.community_platform_community_banned_usersCreateInput;
  }
}
