import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentVote.ICreate;
    communityPlatformComments: IEntity;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.upvote,
      created_at: new Date(),
      voter: {
        connect: { id: props.communityPlatformMembers.id },
      },
      comment: {
        connect: { id: props.communityPlatformComments.id },
      },
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}
