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
    communityPlatformPost: IEntity;
    member: IEntity;
  }) {
    return {
      id: v4(),
      body: props.body.body,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: {
          id: props.communityPlatformPost.id,
        },
      },
      member: {
        connect: {
          id: props.member.id,
        },
      },
      parent: props.body.parentId
        ? {
            connect: {
              id: props.body.parentId,
            },
          }
        : undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
