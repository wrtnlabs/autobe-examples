import { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModerationBanCollector {
  export async function collect(props: {
    body: ICommunityPlatformModerationBan.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      duration: props.body.duration,
      started_at: new Date(),
      ends_at: props.body.duration === "permanent" ? null : new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      user: { connect: { id: props.body.user_id } },
      moderator: { connect: { id: props.body.moderator_id } },
    } satisfies Prisma.community_platform_moderation_bansCreateInput;
  }
}
