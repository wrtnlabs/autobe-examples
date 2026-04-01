import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityFileAccessLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_file_access_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        access_type: true,
        response_size: true,
        response_time_ms: true,
        status_code: true,
        referrer: true,
        user_agent: true,
        ip: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: true,
        actor: true,
      },
    } satisfies Prisma.reddit_community_file_access_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileAccessLog.ISummary> {
    return {
      id: input.id,
      accessType: input.access_type as "thumbnail" | "download" | "view",
      statusCode: input.status_code,
      responseSize: input.response_size,
      responseTimeMs: input.response_time_ms,
      actorType: input.actor_type as "member" | "guest",
      createdAt: toISOStringSafe(input.created_at),
    } satisfies IRedditCommunityFileAccessLog.ISummary;
  }
}
