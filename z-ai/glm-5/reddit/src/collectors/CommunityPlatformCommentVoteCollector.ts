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
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: { connect: { id: props.communityPlatformComments.id } },
      member: { connect: { id: props.communityPlatformMembers.id } },
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}
