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
    communityMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo: member (required)
      member: { connect: { id: props.communityMembers.id } },
      // BelongsTo: post (required)
      post: { connect: { id: props.communityPosts.id } },
      // BelongsTo: parent (optional/nullable)
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
    } satisfies Prisma.community_commentsCreateInput;
  }
}
