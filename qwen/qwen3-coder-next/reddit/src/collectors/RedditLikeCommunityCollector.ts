import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityCollector {
  export async function collect(props: {
    body: IRedditLikeCommunity.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      icon_url: props.body.icon_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.seller.id } },
      posts: undefined,
      subscriptions: undefined,
      moderatorRoles: undefined,
      userBans: undefined,
    } satisfies Prisma.reddit_like_communitiesCreateInput;
  }
}
