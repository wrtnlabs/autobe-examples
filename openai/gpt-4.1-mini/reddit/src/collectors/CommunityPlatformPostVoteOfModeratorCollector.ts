import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostVoteOfModeratorCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostVoteOfModerator.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.voteType,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      moderator: { connect: { id: props.body.communityPlatformModeratorId } },
      postVote: { connect: { id: props.body.communityPlatformPostVoteId } },
    } satisfies Prisma.community_platform_post_vote_of_moderatorsCreateInput;
  }
}
