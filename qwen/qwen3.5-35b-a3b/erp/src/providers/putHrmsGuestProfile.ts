import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmsMemberProfileTransformer } from "../transformers/HrmsMemberProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsGuestProfile(props: {
  guest: GuestPayload;
  body: IHrmsMemberProfile.IUpdate;
}): Promise<IHrmsMemberProfile> {
  // Validate at least one field is provided
  if (
    props.body.displayName === undefined &&
    props.body.phone === undefined &&
    props.body.avatarId === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  // Validate displayName if provided
  if (props.body.displayName !== undefined) {
    if (props.body.displayName.trim().length === 0) {
      throw new HttpException("Display name cannot be empty", 400);
    }
    if (props.body.displayName.length > 100) {
      throw new HttpException("Display name cannot exceed 100 characters", 400);
    }
  }
  // Validate phone if provided - E.164 format
  if (props.body.phone !== undefined && props.body.phone !== null) {
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    if (!phonePattern.test(props.body.phone)) {
      throw new HttpException("Phone must be in E.164 format", 400);
    }
  }
  // Validate avatarId if provided - must reference existing file belonging to guest
  if (props.body.avatarId !== undefined && props.body.avatarId !== null) {
    const file = await MyGlobal.prisma.hrms_files.findUnique({
      where: { id: props.body.avatarId },
    });
    if (file === null) {
      throw new HttpException("Avatar file not found", 404);
    }
    if (file.owner_id !== props.guest.id) {
      throw new HttpException("Cannot use file not belonging to you", 403);
    }
  }
  // Perform atomic update within transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const updateData: Prisma.hrms_membersUpdateInput = {
      updated_at: new Date(),
    };
    if (props.body.displayName !== undefined) {
      updateData.display_name = props.body.displayName;
    }
    if (props.body.phone !== undefined) {
      updateData.phone_number = props.body.phone;
    }
    if (props.body.avatarId !== undefined && props.body.avatarId !== null) {
      updateData.avatar_uri = props.body.avatarId;
    }
    const result = await tx.hrms_members.update({
      where: { id: props.guest.id },
      data: updateData,
      ...HrmsMemberProfileTransformer.select(),
    });
    return result;
  });
  return HrmsMemberProfileTransformer.transform(updated);
}
