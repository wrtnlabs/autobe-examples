import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityFileAtSummaryTransformer {
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
        thumbnails: true,
        userAvatars: true,
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
  ): Promise<IRedditCommunityFile.ISummary> {
    return {
      id: input.id,
      fileType: typia.assert<"user_avatar" | "post_image" | "community_icon">(
        input.file_type,
      ),
      mimeType: input.mime_type,
      filePath: input.file_path,
      fileSize: input.file_size ?? undefined,
      createdAt: toISOStringSafe(input.created_at),
    } satisfies IRedditCommunityFile.ISummary;
  }
}
