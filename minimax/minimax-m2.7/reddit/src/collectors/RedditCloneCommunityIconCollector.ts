import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityIconCollector {
  export async function collect(props: {
    body: IRedditCloneCommunityIcon.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      community: { connect: { id: props.redditCloneCommunities.id } },
      file: { connect: { id: props.body.iconFileId } },
    } satisfies Prisma.reddit_clone_community_iconsCreateInput;
  }
}
