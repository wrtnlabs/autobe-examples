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
    communityPlatformMembers: IEntity;
    communityPlatformComments: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      type: props.body.type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (use connect, relation name NOT FK column name)
      member: { connect: { id: props.communityPlatformMembers.id } },
      comment: { connect: { id: props.communityPlatformComments.id } },
      // HasMany relation - not creating snapshots on initial vote creation
      snapshots: undefined,
    } satisfies Prisma.community_platform_comment_votesCreateInput;
  }
}
