import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityPostImageTransformer {
  export type Payload = Prisma.reddit_community_post_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_path: true,
        file_size: true,
        mime_type: true,
        width: true,
        height: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: RedditCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostImage> {
    return {
      id: input.id,
      file_path: input.file_path,
      file_size: input.file_size,
      mime_type: input.mime_type,
      width: input.width,
      height: input.height,
      sort_order: input.sort_order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
    };
  }
}
