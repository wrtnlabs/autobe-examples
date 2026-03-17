import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityCommentVoteCollector {
  export async function collect(props: {
    body: ICommunityCommentVote.ICreate;
    communityMembers: IEntity;
    communityMemberSessions: IEntity;
    communityComments: IEntity;
  }) {
    return {
      id: v4(),
      vote_type: props.body.voteType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.communityMembers.id } },
      comment: { connect: { id: props.communityComments.id } },
    } satisfies Prisma.community_comment_votesCreateInput;
  }
}
