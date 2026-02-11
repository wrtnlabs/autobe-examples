import { ICommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityVoteCollector {
  export async function collect(props: {
    body: ICommunityVote.ICreate;
    communityMembers: IEntity;
    communityPosts: IEntity;
  }) {
    return {
      id: v4(),
      type: props.body.type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.communityMembers.id } },
      post: { connect: { id: props.communityPosts.id } },
      comment: undefined,
    } satisfies Prisma.community_votesCreateInput;
  }
}
