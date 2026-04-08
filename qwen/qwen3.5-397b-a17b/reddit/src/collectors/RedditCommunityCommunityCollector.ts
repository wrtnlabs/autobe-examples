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
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      icon: props.body.icon,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      owner: { connect: { id: props.redditCommunityMembers.id } },
      // HasMany relations - reverse relations, cannot create
      // posts, subscriptions, moderators, bans are omitted
    } satisfies Prisma.reddit_community_communitiesCreateInput;
  }
}
