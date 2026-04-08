import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditCloneCommunityModerator.ICreate;
    redditCloneCommunities: IEntity;
  }) {
    return {
      id: v4(),
      role: props.body.role,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCloneCommunities.id } },
      userProfile: { connect: { id: props.body.userProfileId } },
    } satisfies Prisma.reddit_clone_community_moderatorsCreateInput;
  }
}
