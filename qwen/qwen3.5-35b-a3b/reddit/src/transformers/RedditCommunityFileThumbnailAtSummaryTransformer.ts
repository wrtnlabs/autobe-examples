import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityFileAtSummaryTransformer } from "./RedditCommunityFileAtSummaryTransformer";

export namespace RedditCommunityFileThumbnailAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_file_thumbnailsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        thumbnail_url: true,
        width: true,
        height: true,
        format: true,
        variant: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: RedditCommunityFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_file_thumbnailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileThumbnail.ISummary> {
    return {
      id: input.id,
      redditCommunityFile:
        await RedditCommunityFileAtSummaryTransformer.transform(input.file),
      thumbnailUrl: input.thumbnail_url,
      width: input.width,
      height: input.height,
      format: input.format,
      variant: input.variant,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
