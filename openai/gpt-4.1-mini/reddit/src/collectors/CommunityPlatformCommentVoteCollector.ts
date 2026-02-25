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
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.voteType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: { connect: { id: props.body.communityPlatformCommentId } },
      // moderatorVotes hasMany relation not created here
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}
