import { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemLogAtSummaryTransformer {
  export type Payload = Prisma.community_platform_system_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        level: true,
        message: true,
        context: true,
        data: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_system_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemLog.ISummary> {
    return {
      id: input.id,
      level: input.level as "INFO" | "WARNING" | "ERROR",
      created_at: input.created_at.toISOString(),
    };
  }
}
