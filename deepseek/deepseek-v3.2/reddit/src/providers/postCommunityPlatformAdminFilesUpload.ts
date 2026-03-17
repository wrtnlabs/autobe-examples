import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformTempUploadCollector } from "../collectors/CommunityPlatformTempUploadCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformTempUploadTransformer } from "../transformers/CommunityPlatformTempUploadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFilesUpload(props: {
  admin: AdminPayload;
  body: ICommunityPlatformTempUpload.ICreate;
}): Promise<ICommunityPlatformTempUpload> {
  // Validate file reference exists
  const file = await MyGlobal.prisma.community_platform_files.findUniqueOrThrow(
    {
      where: { id: props.body.communityPlatformFileId },
    },
  );
  // Verify admin owns the file (actor_type='admin' and actor_id=props.admin.id)
  if (file.actor_type !== "admin" || file.actor_id !== props.admin.id) {
    throw new HttpException("File does not belong to admin", 403);
  }
  // Create temporary upload using collector
  const tempUpload =
    await MyGlobal.prisma.community_platform_temp_uploads.create({
      data: await CommunityPlatformTempUploadCollector.collect({
        body: props.body,
        member: { id: props.admin.id } as IEntity,
        session: { id: props.admin.session_id } as IEntity,
      }),
      ...CommunityPlatformTempUploadTransformer.select(),
    });
  return await CommunityPlatformTempUploadTransformer.transform(tempUpload);
}
