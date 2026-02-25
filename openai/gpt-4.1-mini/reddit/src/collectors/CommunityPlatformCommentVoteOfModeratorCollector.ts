import { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentVoteOfModeratorCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentVoteOfModerator.ICreate;
    communityPlatformModerators: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote: props.body.vote,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      commentVote: { connect: { id: props.body.commentVoteId } },
      moderator: { connect: { id: props.communityPlatformModerators.id } },
    } satisfies Prisma.community_platform_comment_vote_of_moderatorsCreateInput;
  }
}
