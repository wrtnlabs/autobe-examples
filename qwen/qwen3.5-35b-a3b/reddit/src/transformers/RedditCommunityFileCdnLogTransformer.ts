import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityFileAtSummaryTransformer } from "./RedditCommunityFileAtSummaryTransformer";

export namespace RedditCommunityFileCdnLogTransformer {
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
        file: RedditCommunityFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_file_cdn_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileCdnLog> {
    return {
      id: input.id,
      reddit_community_file_id: input.file.id,
      cdn_node_identifier: input.cdn_node_identifier,
      cache_status: input.cache_status,
      http_status_code: input.http_status_code,
      response_size_bytes: input.response_size_bytes,
      cache_hit_bytes: input.cache_hit_bytes,
      origin_fetch_bytes: input.origin_fetch_bytes,
      delivered_at: input.delivered_at.toISOString(),
      user_agent: input.user_agent ?? undefined,
      ip_address: input.ip_address ?? undefined,
      region: input.region ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      file: await RedditCommunityFileAtSummaryTransformer.transform(input.file),
    };
  }
}
