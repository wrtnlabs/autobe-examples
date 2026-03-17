import { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBanReasonTransformer } from "../transformers/CommunityPlatformBanReasonTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminBanReasonsReasonId(props: {
  admin: AdminPayload;
  reasonId: string;
  body: ICommunityPlatformBanReason.IUpdate;
}): Promise<ICommunityPlatformBanReason> {
  // 1. Verify the ban reason exists and is not soft-deleted
  const existingReason =
    await MyGlobal.prisma.community_platform_ban_reasons.findUniqueOrThrow({
      where: {
        id: props.reasonId,
        deleted_at: null,
      },
    });
  // 2. Prepare update data with only provided fields
  const updateData: Record<string, any> = {};
  if (props.body.code !== undefined) {
    updateData.code = props.body.code;
  }
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.severity !== undefined) {
    updateData.severity = props.body.severity;
  }
  if (props.body.active !== undefined) {
    updateData.active = props.body.active;
  }
  // Always update the updated_at timestamp
  updateData.updated_at = new Date();
  // 3. Validate uniqueness constraints if code or title are being updated
  if (props.body.code !== undefined || props.body.title !== undefined) {
    const whereClause: any = {
      deleted_at: null,
      id: { not: props.reasonId },
    };
    if (props.body.code !== undefined) {
      whereClause.code = props.body.code;
    }
    if (props.body.title !== undefined) {
      whereClause.title = props.body.title;
    }
    const conflictingRecord =
      await MyGlobal.prisma.community_platform_ban_reasons.findFirst({
        where: whereClause,
      });
    if (conflictingRecord) {
      throw new HttpException("Code or title already exists", 409);
    }
  }
  // 4. Perform the update
  await MyGlobal.prisma.community_platform_ban_reasons.update({
    where: { id: props.reasonId },
    data: updateData,
  });
  // 5. Fetch the updated record with transformer select
  const updatedReason =
    await MyGlobal.prisma.community_platform_ban_reasons.findUniqueOrThrow({
      where: { id: props.reasonId },
      ...CommunityPlatformBanReasonTransformer.select(),
    });
  // 6. Transform and return
  return await CommunityPlatformBanReasonTransformer.transform(updatedReason);
}
