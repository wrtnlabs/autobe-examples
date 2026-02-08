import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformActivityLogCollector {
  // Safe toISOString function returning string (production version can be imported)
  function toISOStringSafe(date: Date): string {
    return date.toISOString();
  }
  export async function collect(props: {
    body: ICommunityPlatformActivityLog.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      action_type: (props.body as any).action_type ?? null,
      ip_address: (props.body as any).ip_address ?? null,
      user_agent: (props.body as any).user_agent ?? null,
      metadata: (props.body as any).metadata ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      user: (props.body as any).user_id
        ? { connect: { id: (props.body as any).user_id } }
        : undefined,
    } satisfies Prisma.community_platform_activity_logsCreateInput;
  }
}
