import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityModerator.ICreate;
    redditLikeCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditLikeCommunities.id } },
      member: { connect: { id: props.body.member_id } },
    } satisfies Prisma.reddit_like_community_moderatorsCreateInput;
  }
}
