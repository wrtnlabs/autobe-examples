import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommunityCollector {
  export async function collect(props: {
    body: IRedditPlatformCommunity.ICreate;
    redditPlatformUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: "",
      description: null,
      icon_url: null,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      owner: { connect: { id: props.redditPlatformUsers.id } },
    } satisfies Prisma.reddit_platform_communitiesCreateInput;
  }
}
