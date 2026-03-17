import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentFileCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentFile.ICreate;
    comment: IEntity;
  }) {
    return {
      id: v4(),
      original_name: props.body.original_name,
      mime_type: props.body.mime_type,
      storage_key: props.body.storage_key,
      size: props.body.size,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: {
        connect: {
          id: props.comment.id,
        },
      },
    } satisfies Prisma.community_platform_comment_filesCreateInput;
  }
}
