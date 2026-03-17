import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommunityBanCollector {
  export async function collect(props: {
    body: IRedditPlatformCommunityBan.ICreate;
    redditPlatformCommunities: IEntity;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditPlatformCommunities.id } },
      member: { connect: { id: props.body.reddit_platform_member_id } },
      bannedBy: { connect: { id: props.redditPlatformMembers.id } },
    } satisfies Prisma.reddit_platform_community_bansCreateInput;
  }
}
