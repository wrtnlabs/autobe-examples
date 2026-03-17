import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentVote.ICreate;
    member: IEntity;
    comment: IEntity;
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
      comment: {
        connect: {
          id: props.comment.id,
        },
      },
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}
