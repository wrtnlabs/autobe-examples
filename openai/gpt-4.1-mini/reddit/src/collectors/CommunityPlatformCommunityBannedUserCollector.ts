import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommunityBannedUserCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommunityBannedUser.ICreate & {
      banned_at: Date;
      unbanned_at?: Date | null;
      ban_reason: string;
      communityId: string;
      userId: string;
    };
  }) {
    const id: string = v4();
    return {
      id,
      banned_at: props.body.banned_at,
      unbanned_at: props.body.unbanned_at ?? null,
      ban_reason: props.body.ban_reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.communityId } },
      user: { connect: { id: props.body.userId } },
    } satisfies Prisma.community_platform_community_banned_usersCreateInput;
  }
}
