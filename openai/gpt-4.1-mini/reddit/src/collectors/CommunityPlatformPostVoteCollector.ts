import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostVote.ICreate & {
      vote_type: string;
      postId: string;
    };
  }) {
    const id = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      post: { connect: { id: props.body.postId } },
    } satisfies Prisma.community_platform_post_votesCreateInput;
  }
}
