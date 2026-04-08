import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityBanCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityBan.ICreate;
    redditLikeCommunities: IEntity;
    redditLikeMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      community: { connect: { id: props.redditLikeCommunities.id } },
      bannedMember: { connect: { id: props.body.member_id } },
      bannedBy: { connect: { id: props.redditLikeMembers.id } },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.reddit_like_community_bansCreateInput;
  }
}
