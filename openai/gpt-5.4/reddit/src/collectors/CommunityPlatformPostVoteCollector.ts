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
    member: IEntity;
    post: IEntity;
  }) {
    return {
      id: v4(),
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: {
        connect: {
          id: props.member.id,
        },
      },
      post: {
        connect: {
          id: props.post.id,
        },
      },
    } satisfies Prisma.community_platform_post_votesCreateInput;
  }
}
