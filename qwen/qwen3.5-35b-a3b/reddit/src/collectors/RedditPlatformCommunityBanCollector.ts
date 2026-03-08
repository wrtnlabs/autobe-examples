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
    redditPlatformCommunities: IEntity; // from path parameter communityId
    redditPlatformMembers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expires_at: props.body.expires_at ?? null,
      community: { connect: { id: props.redditPlatformCommunities.id } },
      bannedUser: { connect: { id: props.body.user_id } },
      bannedBy: { connect: { id: props.redditPlatformMembers.id } },
    } satisfies Prisma.reddit_platform_community_bansCreateInput;
  }
}
