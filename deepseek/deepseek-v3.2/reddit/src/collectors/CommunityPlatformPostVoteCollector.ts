import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostVoteCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostVote.ICreate;
    member: IEntity; // from authorized actor
    post: IEntity; // from path parameter postId
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      type: props.body.type,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.member.id } },
      post: { connect: { id: props.post.id } },
      // HasMany relations (not created)
      // snapshots: undefined
    } satisfies Prisma.community_platform_post_votesCreateInput;
  }
}
