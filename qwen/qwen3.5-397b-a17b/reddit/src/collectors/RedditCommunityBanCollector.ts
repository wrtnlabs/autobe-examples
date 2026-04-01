import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityBanCollector {
  export async function collect(props: {
    body: IRedditCommunityBan.ICreate;
    redditCommunityCommunities: IEntity;
    redditCommunityMembers: IEntity;
  }) {
    return {
      id: v4(),
      community: { connect: { id: props.redditCommunityCommunities.id } },
      bannedMember: { connect: { id: props.body.reddit_community_member_id } },
      bannedBy: { connect: { id: props.redditCommunityMembers.id } },
      reason: props.body.reason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.reddit_community_bansCreateInput;
  }
}
