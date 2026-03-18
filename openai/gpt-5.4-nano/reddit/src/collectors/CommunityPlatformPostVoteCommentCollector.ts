import { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostVoteCommentCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostVoteComment.ICreate;
    communityPlatformPosts: IEntity;
    communityPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      posted_at: now,
      body_text: props.body.bodyText,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      post: { connect: { id: props.communityPlatformPosts.id } },
      parentComment:
        props.body.parentCommentId != null
          ? { connect: { id: props.body.parentCommentId } }
          : undefined,
      author: { connect: { id: props.communityPlatformMembers.id } },
      editedBy: undefined,
      deletedBy: undefined,
      replies: undefined,
      commentVotes: undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
