import { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformSystemLogTransformer {
  export type Payload = Prisma.community_platform_system_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      // This would normally have Prisma query parameters
    } satisfies Prisma.community_platform_system_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSystemLog> {
    return {
      level: typia.assert<"INFO" | "WARNING" | "ERROR">(input.level),
      id: input.id,
      message: input.message,
      context: input.context ?? null,
      data: input.data ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
