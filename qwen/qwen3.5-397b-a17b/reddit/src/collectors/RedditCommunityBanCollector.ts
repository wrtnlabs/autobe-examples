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
      reason: props.body.reason,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCommunityCommunities.id } },
      member: { connect: { id: props.body.reddit_community_member_id } },
      issuer: { connect: { id: props.redditCommunityMembers.id } },
    } satisfies Prisma.reddit_community_bansCreateInput;
  }
}
