import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformAdminAtSummaryTransformer } from "./RedditPlatformAdminAtSummaryTransformer";

export namespace RedditPlatformAdminSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        created_at: true,
        expired_at: true,
        admin: RedditPlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdminSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      admin: await RedditPlatformAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
