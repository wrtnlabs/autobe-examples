import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentSnapshotCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentSnapshot.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      status: props.body.status,
      body: props.body.body,
      parent_comment_id: props.body.parent_comment_id ?? null,
      post_id: props.body.post_id,
      created_at: new Date(),
      // BelongsTo relations
      comment: { connect: { id: props.body.comment_id } },
      editor: props.body.editor_id
        ? { connect: { id: props.body.editor_id } }
        : undefined,
    } satisfies Prisma.community_platform_comment_snapshotsCreateInput;
  }
}
