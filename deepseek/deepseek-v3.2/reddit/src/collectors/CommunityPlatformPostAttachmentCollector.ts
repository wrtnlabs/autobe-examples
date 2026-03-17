import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostAttachmentCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostAttachment.ICreate;
    post: IEntity;
    member: IEntity;
    session: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      position: props.body.position,
      file_type: props.body.file_type,
      original_filename: props.body.original_filename,
      file_size: props.body.file_size,
      mime_type: props.body.mime_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (relation names, not FK columns)
      post: { connect: { id: props.post.id } },
      file: { connect: { id: props.body.community_platform_file_id } },
    } satisfies Prisma.community_platform_post_attachmentsCreateInput;
  }
}
