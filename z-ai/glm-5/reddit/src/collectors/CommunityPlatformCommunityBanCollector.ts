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
    communityPlatformCommunities: IEntity;
    communityPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.communityPlatformCommunities.id } },
      bannedUser: { connect: { id: props.body.bannedUserId } },
      bannedBy: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_community_bansCreateInput;
  }
}
