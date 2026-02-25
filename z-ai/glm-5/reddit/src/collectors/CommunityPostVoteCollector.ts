import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPostVoteCollector {
  export async function collect(props: {
    body: ICommunityPostVote.ICreate;
    member: IEntity;
    post: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      is_upvote: props.body.vote === 1,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.community_post_votesCreateInput;
  }
}
