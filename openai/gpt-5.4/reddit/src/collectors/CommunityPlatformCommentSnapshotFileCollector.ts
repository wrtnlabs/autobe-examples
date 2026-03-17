import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentSnapshotFileCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentSnapshotFile.ICreate;
    communityPlatformCommentSnapshots: IEntity;
  }) {
    const now = new globalThis.Date();
    return {
      id: v4(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      commentSnapshot: {
        connect: {
          id: props.communityPlatformCommentSnapshots.id,
        },
      },
      commentFile: {
        connectOrCreate: {
          where: {
            storage_key: props.body.storage_key,
          },
          create: {
            id: v4(),
            original_name: props.body.original_name,
            mime_type: props.body.mime_type,
            storage_key: props.body.storage_key,
            size: props.body.size satisfies number as number,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            comment: {
              connect: {
                id: props.communityPlatformCommentSnapshots.id,
              },
            },
          },
        },
      },
    } satisfies Prisma.community_platform_comment_snapshot_filesCreateInput;
  }
}
