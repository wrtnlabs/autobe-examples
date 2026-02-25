import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityCommentCollector {
  export async function collect(props: {
    body: ICommunityComment.ICreate;
    communityPosts: IEntity;
    communityMembers: IEntity;
  }) {
    return {
      id: v4(),
      content: props.body.content,
      vote_score: 0,
      upvote_count: 0,
      downvote_count: 0,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      edited_at: null,
      deleted_at: null,
      post: { connect: { id: props.communityPosts.id } },
      author: { connect: { id: props.communityMembers.id } },
      parent: undefined,
    } satisfies Prisma.community_commentsCreateInput;
  }
}
