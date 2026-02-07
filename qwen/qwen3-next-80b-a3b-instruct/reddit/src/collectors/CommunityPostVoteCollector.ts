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
    communityMembers: IEntity;
    communityPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: (props.body as any).vote_type, // DTO schema defect - vote_type required by DB but absent in ICreate
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.communityPosts.id } },
      member: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_post_votesCreateInput;
  }
}
