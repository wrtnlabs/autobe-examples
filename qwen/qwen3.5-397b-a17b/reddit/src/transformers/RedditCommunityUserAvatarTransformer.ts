import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityUserProfileAtSummaryTransformer } from "./RedditCommunityUserProfileAtSummaryTransformer";

export namespace RedditCommunityUserAvatarTransformer {
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
        updated_at: true,
        profile: RedditCommunityUserProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_user_avatarsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserAvatar> {
    return {
      id: input.id,
      profile: await RedditCommunityUserProfileAtSummaryTransformer.transform(
        input.profile,
      ),
      file_name: input.file_name,
      file_size: input.file_size,
      mime_type: input.mime_type,
      storage_path: input.storage_path,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
