import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformActivityLogAtSummaryTransformer {
  export type Payload = Prisma.community_platform_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        ip_address: true,
        user_agent: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformActivityLog.ISummary> {
    return {
      id: input.id,
      user:
        input.user === null
          ? null
          : await CommunityPlatformUserAtSummaryTransformer.transform(
              input.user,
            ),
      actionType: input.action_type,
      ipAddress: input.ip_address ?? null,
      userAgent: input.user_agent ?? null,
      metadata: input.metadata ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
