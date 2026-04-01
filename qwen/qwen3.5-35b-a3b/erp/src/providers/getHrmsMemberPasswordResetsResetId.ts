import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberPasswordReset";
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

export async function getHrmsMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IHrmsMemberPasswordReset> {
  const resetRecord =
    await MyGlobal.prisma.hrms_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      select: {
        id: true,
        hrms_member_id: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        member: {
          select: { id: true },
        },
      },
    });
  if (resetRecord.member.id !== props.member.id) {
    const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst(
      {
        where: {
          hrms_member_id: props.member.id,
        },
        include: {
          organizationRole: {
            select: { name: true },
          },
        },
      },
    );
    if (
      memberOrg === null ||
      memberOrg.organizationRole === null ||
      (memberOrg.organizationRole.name !== "Owner" &&
        memberOrg.organizationRole.name !== "Manager")
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return {
    id: resetRecord.id,
    hrms_member_id: resetRecord.hrms_member_id,
    expires_at: toISOStringSafe(resetRecord.expires_at),
    used_at: resetRecord.used_at ? toISOStringSafe(resetRecord.used_at) : null,
    created_at: toISOStringSafe(resetRecord.created_at),
    updated_at: toISOStringSafe(resetRecord.updated_at),
  } satisfies IHrmsMemberPasswordReset;
}
