import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostVote.ICreate;
    communityPlatformUsers: IEntity;
    communityPlatformPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.communityPlatformUsers.id } },
      post: { connect: { id: props.communityPlatformPosts.id } },
    } satisfies Prisma.community_platform_post_votesCreateInput;
  }
}
