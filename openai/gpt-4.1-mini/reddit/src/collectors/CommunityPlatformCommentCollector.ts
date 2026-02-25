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
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      post: { connect: { id: props.body.postId } },
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
      reportedContentReports: undefined,
      userVotes: undefined,
      commentReports: undefined,
      moderationLogs: undefined,
      children: undefined,
      commentVotes: undefined,
      commentSortOrders: undefined,
      deletionRecords: undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
