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
    communityPlatformPosts: IEntity;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.communityPlatformPosts.id } },
      author: { connect: { id: props.communityPlatformMembers.id } },
      parent: undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
