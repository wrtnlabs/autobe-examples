import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(
  date: Date,
): string & import("typia").tags.Format<"date-time"> {
  return date.toISOString() as string &
    import("typia").tags.Format<"date-time">;
}
export namespace CommunityPlatformActivityLogCollector {
  export async function collect(props: {
    body: ICommunityPlatformActivityLog.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      action_type: props.body.action_type,
      ip_address: props.body.ip_address ?? null,
      user_agent: props.body.user_agent ?? null,
      metadata: props.body.metadata ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      user: props.body.user_id
        ? { connect: { id: props.body.user_id } }
        : undefined,
    } satisfies Prisma.community_platform_activity_logsCreateInput;
  }
}
