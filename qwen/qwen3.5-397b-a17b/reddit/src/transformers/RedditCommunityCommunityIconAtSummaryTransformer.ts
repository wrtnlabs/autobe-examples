import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommunityIconAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_community_iconsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        storage_key: true,
        original_filename: true,
        mime_type: true,
        file_size: true,
        width: true,
        height: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_community_iconsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunityIcon.ISummary> {
    return {
      id: input.id,
      storageUrl: `${process.env.STORAGE_URL}/${input.storage_key}`,
      originalFilename: input.original_filename,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      width: input.width,
      height: input.height,
      createdAt: input.created_at.toISOString(),
    };
  }
}
