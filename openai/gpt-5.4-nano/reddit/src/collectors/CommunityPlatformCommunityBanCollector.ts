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
  }) {
    return {
      id: v4(),
      banned_at: new Date(props.body.banned_at),
      unbanned_at: props.body.unbanned_at
        ? new Date(props.body.unbanned_at)
        : null,
      ban_reason: props.body.ban_reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      bannedUser: { connect: { id: props.body.banned_user_id } },
      appliedByModerator: {
        connect: { id: props.body.applied_by_moderator_id },
      },
    } satisfies Prisma.community_platform_community_bansCreateInput;
  }
}
