import { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.community_platform_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        user_agent: true,
        created_at: true,
        expired_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMemberSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
