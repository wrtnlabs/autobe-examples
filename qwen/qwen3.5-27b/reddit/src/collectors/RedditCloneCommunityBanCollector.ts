import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityBanCollector {
  export async function collect(props: {
    body: IRedditCloneCommunityBan.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneModerators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      ban_reason: props.body.ban_reason,
      expires_at: props.body.expires_at
        ? new Date(props.body.expires_at)
        : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCloneCommunities.id } },
      bannedMember: { connect: { id: props.body.reddit_clone_member_id } },
      banningModerator: { connect: { id: props.redditCloneModerators.id } },
    } satisfies Prisma.reddit_clone_community_bansCreateInput;
  }
}
