import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityUserAvatarAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_user_avatarsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        file_size: true,
        mime_type: true,
        storage_path: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_community_user_avatarsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserAvatar.ISummary> {
    return {
      id: input.id,
      fileName: input.file_name,
      fileSize: input.file_size,
      mimeType: input.mime_type,
      storagePath: input.storage_path,
      createdAt: input.created_at.toISOString(),
    };
  }
}
