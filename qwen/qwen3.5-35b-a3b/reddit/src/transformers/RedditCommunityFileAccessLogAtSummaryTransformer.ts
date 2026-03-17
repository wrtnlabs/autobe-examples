import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityFileAccessLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_file_access_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_type: true,
        status_code: true,
        response_size: true,
        response_time_ms: true,
        actor_type: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_community_file_access_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileAccessLog.ISummary> {
    return {
      id: input.id,
      accessType: typia.assert<"thumbnail" | "download" | "view">(
        input.access_type,
      ),
      statusCode: input.status_code,
      responseSize: input.response_size,
      responseTimeMs: input.response_time_ms,
      actorType: typia.assert<"member" | "guest">(input.actor_type),
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
