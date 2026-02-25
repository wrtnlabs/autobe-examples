import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditCommunityCommunityModerator.ICreate;
    redditCommunityCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      user: { connect: { id: props.body.userId } },
      community: { connect: { id: props.redditCommunityCommunities.id } },
    } satisfies Prisma.reddit_community_moderatorsCreateInput;
  }
}
