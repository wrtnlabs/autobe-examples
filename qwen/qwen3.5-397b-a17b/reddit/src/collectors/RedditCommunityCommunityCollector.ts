import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommunityCollector {
  export async function collect(props: {
    body: IRedditCommunityCommunity.ICreate;
    redditCommunityMembers: IEntity;
    redditCommunityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      owner: { connect: { id: props.redditCommunityMembers.id } },
      // HasMany relations - not needed for create
      subscriptions: undefined,
      moderators: undefined,
      bans: undefined,
      posts: undefined,
      postSnapshots: undefined,
      // HasOne relation - conditional nested create with correct schema fields
      communityIcons: props.body.iconImageUri
        ? {
            create: {
              id: v4(),
              storage_key: v4(),
              original_filename:
                props.body.iconImageUri.split("/").pop() ?? "icon.png",
              mime_type: "image/png",
              file_size: 0,
              width: null,
              height: null,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          }
        : undefined,
    } satisfies Prisma.reddit_community_communitiesCreateInput;
  }
}
