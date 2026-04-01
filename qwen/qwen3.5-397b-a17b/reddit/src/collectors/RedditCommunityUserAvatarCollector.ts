import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityUserAvatarCollector {
  export async function collect(props: {
    body: IRedditCommunityUserAvatar.ICreate;
    redditCommunityUserProfiles: IEntity;
  }) {
    const id: string = v4();
    // Extract file metadata from URI
    // In production, actual file metadata would be extracted during upload
    const uri = props.body.file;
    const fileNameMatch = uri.match(/\/([^\/?#]+)$/);
    const file_name = fileNameMatch ? fileNameMatch[1] : "avatar.png";
    const storage_path = uri;
    return {
      // Scalar fields
      id,
      file_name,
      file_size: 0,
      mime_type: "image/png",
      storage_path,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      profile: { connect: { id: props.redditCommunityUserProfiles.id } },
    } satisfies Prisma.reddit_community_user_avatarsCreateInput;
  }
}
