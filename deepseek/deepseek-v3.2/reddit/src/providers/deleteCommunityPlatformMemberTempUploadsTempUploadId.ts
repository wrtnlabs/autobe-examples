import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberTempUploadsTempUploadId(props: {
  member: MemberPayload;
  tempUploadId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the temp upload exists and member is authorized
  const tempUpload =
    await MyGlobal.prisma.community_platform_temp_uploads.findUnique({
      where: {
        id: props.tempUploadId,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        deleted_at: true,
      },
    });
  if (tempUpload === null) {
    throw new HttpException("Temporary upload not found", 404);
  }
  if (tempUpload.deleted_at !== null) {
    throw new HttpException("Temporary upload already deleted", 404);
  }
  if (tempUpload.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "You are not authorized to delete this temporary upload",
      403,
    );
  }
  // Delete the temporary upload - cascade will delete associated file via FK
  await MyGlobal.prisma.community_platform_temp_uploads.delete({
    where: {
      id: props.tempUploadId,
    },
  });
  // Return void - successful deletion
}
