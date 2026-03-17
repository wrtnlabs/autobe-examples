import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityFileCdnLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_file_cdn_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        cdn_node_identifier: true,
        cache_status: true,
        http_status_code: true,
        response_size_bytes: true,
        cache_hit_bytes: true,
        origin_fetch_bytes: true,
        delivered_at: true,
        user_agent: true,
        ip_address: true,
        region: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: true,
      },
    } satisfies Prisma.reddit_community_file_cdn_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileCdnLog.ISummary> {
    return {
      id: input.id,
      cdnNodeIdentifier: input.cdn_node_identifier,
      cacheStatus: input.cache_status,
      httpStatusCode: input.http_status_code,
      responseSizeBytes: input.response_size_bytes,
      cacheHitBytes: input.cache_hit_bytes,
      originFetchBytes: input.origin_fetch_bytes,
      deliveredAt: input.delivered_at.toISOString(),
      userAgent: input.user_agent ?? null,
      ipAddress: input.ip_address ?? null,
      region: input.region ?? null,
    } satisfies IRedditCommunityFileCdnLog.ISummary;
  }
}
