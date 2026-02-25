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
    redditCommunityCommunityModerators: IEntity;
    redditCommunityCommunityOwners: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      expires_at: props.body.expires_at ?? null,
      reason: props.body.reason,
      is_active: true,
      user: {
        connect: {
          id:
            props.redditCommunityMembers.id ||
            props.redditCommunityCommunityModerators.id ||
            props.redditCommunityCommunityOwners.id,
        },
      },
      community: { connect: { id: props.redditCommunityCommunities.id } },
    } satisfies Prisma.reddit_community_bansCreateInput;
  }
}
