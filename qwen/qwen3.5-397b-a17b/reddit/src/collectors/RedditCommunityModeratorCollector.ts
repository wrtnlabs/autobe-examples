import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditCommunityModerator.ICreate;
    redditCommunityCommunities: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      assigned_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.body.memberId } },
      community: { connect: { id: props.redditCommunityCommunities.id } },
    } satisfies Prisma.reddit_community_moderatorsCreateInput;
  }
}
