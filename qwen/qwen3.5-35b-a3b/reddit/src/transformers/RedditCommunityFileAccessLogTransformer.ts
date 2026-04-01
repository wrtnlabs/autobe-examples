import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityFileAccessLogTransformer {
  export type Payload = Prisma.reddit_community_file_access_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file: { select: { id: true } },
        actor: { select: { id: true } },
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
      },
    } satisfies Prisma.reddit_community_file_access_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileAccessLog> {
    return {
      id: input.id,
      fileId: input.file.id,
      actorId: input.actor?.id ?? undefined,
      actorType: input.actor_type,
      accessType: input.access_type,
      responseSize: input.response_size,
      responseTimeMs: input.response_time_ms,
      statusCode: input.status_code,
      referrer: input.referrer ?? undefined,
      userAgent: input.user_agent ?? undefined,
      ipAddress: input.ip ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
