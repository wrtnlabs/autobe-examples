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
    redditCommunityCommunityOwners: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      icon_url: props.body.icon_url ?? null,
      subscriber_count: 1,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.redditCommunityCommunityOwners.id } },
    } satisfies Prisma.reddit_community_communitiesCreateInput;
  }
}
