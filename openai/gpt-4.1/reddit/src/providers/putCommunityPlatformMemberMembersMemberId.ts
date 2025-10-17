import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: ICommunityPlatformMember.IUpdate;
}): Promise<ICommunityPlatformMember> {
  const { member, memberId, body } = props;

  // 1. Only owner can update their profile
  if (member.id !== memberId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile.",
      403,
    );
  }

  // 2. Find the member, must exist and not be deleted
  const existing = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: memberId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Not Found: Member does not exist.", 404);
  }

  // 3. Members may not update 'status' (admin/system only)
  if ("status" in body && typeof body.status === "string") {
    throw new HttpException(
      "Forbidden: Only admins can update account status.",
      403,
    );
  }

  // 4. Email update (nullable: skip if not given)
  const updateFields = {
    ...(body.email !== undefined ? { email: body.email } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  let updated;
  try {
    updated = await MyGlobal.prisma.community_platform_members.update({
      where: { id: memberId },
      data: updateFields,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray((err as any).meta?.target) &&
      (err as any).meta?.target.includes("email")
    ) {
      throw new HttpException("Conflict: That email is already taken.", 409);
    }
    throw err;
  }

  return {
    id: updated.id,
    email: updated.email,
    email_verified: updated.email_verified,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
