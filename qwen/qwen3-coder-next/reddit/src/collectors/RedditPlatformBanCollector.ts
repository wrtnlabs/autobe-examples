import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformBanCollector {
  export async function collect(props: {
    body: IRedditPlatformBan.ICreate;
    redditPlatformCommunities: IEntity;
    user: IEntity;
    bannedBy: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      expires_at: null,
      deleted_at: null,
      community: { connect: { id: props.redditPlatformCommunities.id } },
      user: { connect: { id: props.user.id } },
      bannedBy: { connect: { id: props.bannedBy.id } },
    } satisfies Prisma.reddit_platform_bansCreateInput;
  }
}
