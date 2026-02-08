import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformModerationLogCollector {
  function toISOStringSafe(date: Date): string {
    return date.toISOString();
  }
  export async function collect(props: {
    body: ICommunityPlatformModerationLog.ICreate;
    moderator: IEntity;
  }): Promise<Prisma.community_platform_moderation_logsCreateInput> {
    const id: string = v4();
    const body = props.body as any;
    return {
      id: id,
      action_type:
        "action_type" in body
          ? body["action_type"]
          : "actionType" in body
            ? body["actionType"]
            : null,
      action_details:
        "action_details" in body
          ? body["action_details"]
          : "actionDetails" in body
            ? body["actionDetails"]
            : null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      moderator: { connect: { id: props.moderator.id } },
      post: body.post_id ? { connect: { id: body.post_id } } : undefined,
      comment: body.comment_id
        ? { connect: { id: body.comment_id } }
        : undefined,
    } satisfies Prisma.community_platform_moderation_logsCreateInput;
  }
}
