import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformReportAtRemoveTransformer {
  export type Payload = Prisma.reddit_platform_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reported_type: true,
        reported_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
        reporter: true,
        resolvedBy: true,
      },
    } satisfies Prisma.reddit_platform_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformReport.IRemove> {
    return {
      id: input.id,
      resolvedAt: input.resolved_at ? toISOStringSafe(input.resolved_at) : null,
    };
  }
}
