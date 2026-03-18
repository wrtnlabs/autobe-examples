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
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: {
          id: props.post.id,
        },
      },
      member: {
        connect: {
          id: props.member.id,
        },
      },
      parent:
        props.body.parent_id != null
          ? {
              connect: {
                id: props.body.parent_id,
              },
            }
          : undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
