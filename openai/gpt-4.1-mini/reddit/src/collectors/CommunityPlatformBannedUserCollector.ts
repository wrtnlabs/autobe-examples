import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformBannedUserCollector {
  export async function collect(props: {
    body: ICommunityPlatformBannedUser.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      banned_at: new Date(props.body.banned_at),
      unbanned_at: props.body.unbanned_at
        ? new Date(props.body.unbanned_at)
        : null,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.body.community_platform_user_id } },
      community: {
        connect: { id: props.body.community_platform_community_id },
      },
    } satisfies Prisma.community_platform_banned_usersCreateInput;
  }
}
