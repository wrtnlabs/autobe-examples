import { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentVoteOfUsersCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentVoteOfUsers.ICreate;
    comment: IEntity;
    user: IEntity;
    vote_type: string;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: { connect: { id: props.comment.id } },
      user: { connect: { id: props.user.id } },
    } satisfies Prisma.community_platform_comment_vote_of_usersCreateInput;
  }
}
