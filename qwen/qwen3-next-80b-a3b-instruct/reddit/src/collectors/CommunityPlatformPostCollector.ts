import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    communityPlatformMembers: IEntity; // from authorized actor
    communityPlatformMemberSessions: IEntity; // from authorized session
    communityPlatformCommunities: IEntity; // from path parameter communityCode
  }) {
    return {
      id: v4(),
      title: props.body.title,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      vote_score: 0,
      comment_count: 0,
      author: {
        connect: { id: props.communityPlatformMembers.id },
      },
      community: {
        connect: { id: props.communityPlatformCommunities.id },
      },
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
