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
    communityPlatformComments: IEntity;
    communityPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      vote_direction: props.body.vote_direction,
      voted_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      comment: { connect: { id: props.communityPlatformComments.id } },
      voter: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}
