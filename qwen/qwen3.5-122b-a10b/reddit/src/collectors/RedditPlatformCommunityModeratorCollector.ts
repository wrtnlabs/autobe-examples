import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditPlatformCommunityModerator.ICreate;
    redditPlatformCommunities: IEntity;
    redditPlatformMembers: IEntity;
    redditPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditPlatformMembers.id } },
      community: { connect: { id: props.redditPlatformCommunities.id } },
    } satisfies Prisma.reddit_platform_community_moderatorsCreateInput;
  }
}
