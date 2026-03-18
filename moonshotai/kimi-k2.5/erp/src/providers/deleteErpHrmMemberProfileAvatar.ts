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

export async function deleteErpHrmMemberProfileAvatar(props: {
  member: MemberPayload;
}): Promise<void> {
  // Retrieve member to check if avatar exists
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true, avatar_url: true },
  });
  // Return 404 if no avatar exists
  if (member.avatar_url === null) {
    throw new HttpException("Avatar not found", 404);
  }
  // Clear the avatar field
  await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      avatar_url: null,
      updated_at: new Date(),
    },
  });
}
