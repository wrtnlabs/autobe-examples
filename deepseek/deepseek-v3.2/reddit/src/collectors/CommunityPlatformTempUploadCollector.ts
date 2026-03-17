import { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformTempUploadCollector {
  export async function collect(props: {
    body: ICommunityPlatformTempUpload.ICreate;
    member: IEntity;
    session: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    return {
      // Scalar fields
      id,
      status: "pending",
      original_filename: props.body.originalFilename,
      mime_type: props.body.mimeType,
      file_size: props.body.fileSize,
      content_hash: props.body.contentHash,
      upload_ip: props.body.uploadIp,
      user_agent: props.body.userAgent,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // Relations
      file: { connect: { id: props.body.communityPlatformFileId } },
      uploader: { connect: { id: props.member.id } },
    } satisfies Prisma.community_platform_temp_uploadsCreateInput;
  }
}
