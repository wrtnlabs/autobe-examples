import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentCollector {
  export async function collect(props: {
    body: ICommunityPlatformComment.ICreate;
    post: IEntity;
    author: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      content: props.body.content,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.author.id } },
      post: { connect: { id: props.post.id } },
      parent: props.body.parentCommentId
        ? { connect: { id: props.body.parentCommentId } }
        : undefined,
      // HasMany relations (not applicable for creation)
      replies: undefined,
      snapshots: undefined,
      votes: undefined,
      voteSnapshots: undefined,
      commentReports: undefined,
      reportedByUsers: undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
