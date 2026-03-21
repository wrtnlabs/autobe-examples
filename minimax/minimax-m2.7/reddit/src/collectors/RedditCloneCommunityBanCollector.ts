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
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCloneMembers.id } },
      icon: undefined,
      communityModerators: undefined,
      communityBans: undefined,
      communityReports: undefined,
      subscriptions: undefined,
      posts: undefined,
      moderators: undefined,
      moderatorSnapshots: undefined,
      bans: undefined,
      reports: undefined,
    } satisfies Prisma.reddit_clone_communitiesCreateInput;
  }
}
