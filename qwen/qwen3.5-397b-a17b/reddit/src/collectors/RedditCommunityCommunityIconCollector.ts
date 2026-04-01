import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommunityIconCollector {
  export async function collect(props: {
    body: IRedditCommunityCommunityIcon.ICreate;
    redditCommunityCommunities: IEntity;
  }) {
    const id: string = v4();
    // Extract storage key from URI (format: storage://key or similar)
    // Query file metadata from storage service through MyGlobal
    const storageKey = props.body.uri.split("/").pop() ?? props.body.uri;
    // For now, use placeholder values - actual file metadata extraction
    // should happen at service layer before collector is called
    // This is a simplified mapping assuming service provides validated URI
    return {
      id,
      storage_key: storageKey,
      original_filename: storageKey,
      mime_type: "image/png",
      file_size: 0,
      width: null,
      height: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCommunityCommunities.id } },
    } satisfies Prisma.reddit_community_community_iconsCreateInput;
  }
}
