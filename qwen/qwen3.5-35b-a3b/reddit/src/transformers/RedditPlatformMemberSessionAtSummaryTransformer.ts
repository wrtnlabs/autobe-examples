import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        member: true,
      },
    } satisfies Prisma.reddit_platform_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberSession.ISummary> {
    return {
      id: input.id,
      member_id: input.member.id,
      ip: input.ip,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
    };
  }
}
