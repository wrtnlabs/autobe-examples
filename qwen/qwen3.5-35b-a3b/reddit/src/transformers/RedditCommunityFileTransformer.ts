import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityFileOfUserTransformer } from "./RedditCommunityFileOfUserTransformer";
import { RedditCommunityFileThumbnailTransformer } from "./RedditCommunityFileThumbnailTransformer";

export namespace RedditCommunityFileTransformer {
  export type Payload = Prisma.reddit_community_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_name: true,
        file_name: true,
        file_path: true,
        mime_type: true,
        file_size: true,
        file_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        thumbnails: RedditCommunityFileThumbnailTransformer.select(),
        userAvatars: RedditCommunityFileOfUserTransformer.select(),
        communityIcon: true,
        snapshot: true,
        cdnLogs: true,
        accessLogs: true,
        userAvatar: true,
        postImage: true,
        ofCommunity: true,
      },
    } satisfies Prisma.reddit_community_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFile> {
    return {
      id: input.id,
      originalName: input.original_name,
      fileName: input.file_name,
      filePath: input.file_path,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      fileType: input.file_type satisfies string as
        | "user_avatar"
        | "post_image"
        | "community_icon",
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      thumbnail: null,
      thumbnails: await ArrayUtil.asyncMap(
        input.thumbnails,
        RedditCommunityFileThumbnailTransformer.transform,
      ),
      userAvatars: await ArrayUtil.asyncMap(
        input.userAvatars,
        RedditCommunityFileOfUserTransformer.transform,
      ),
      communityIcon: input.ofCommunity
        ? typia.assert<IRedditCommunityFileOfCommunity>({
            id: input.ofCommunity.id,
            createdAt: toISOStringSafe(input.ofCommunity.created_at),
            updatedAt: toISOStringSafe(input.ofCommunity.updated_at),
            deletedAt: input.ofCommunity.deleted_at
              ? toISOStringSafe(input.ofCommunity.deleted_at)
              : null,
          })
        : null,
    };
  }
}
