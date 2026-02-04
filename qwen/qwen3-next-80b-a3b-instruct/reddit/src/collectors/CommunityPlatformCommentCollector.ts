import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentCollector {
  export async function collect(props: {
    body: ICommunityPlatformComment.ICreate;
    communityPlatformMembers: IEntity; // from authorized actor
    communityPlatformMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      content: props.body.content,
      vote_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: {
        connect: { id: props.communityPlatformMembers.id },
      },
      parent: undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
