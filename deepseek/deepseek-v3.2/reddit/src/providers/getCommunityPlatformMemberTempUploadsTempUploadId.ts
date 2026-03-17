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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformTempUploadTransformer } from "../transformers/CommunityPlatformTempUploadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberTempUploadsTempUploadId(props: {
  member: MemberPayload;
  tempUploadId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformTempUpload> {
  // Verify the temp upload exists and belongs to the authenticated member
  const tempUpload =
    await MyGlobal.prisma.community_platform_temp_uploads.findUniqueOrThrow({
      where: {
        id: props.tempUploadId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      ...CommunityPlatformTempUploadTransformer.select(),
    });
  // Return the transformed response
  return await CommunityPlatformTempUploadTransformer.transform(tempUpload);
}
