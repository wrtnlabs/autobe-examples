import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string;
}): Promise<void> {
  // Verify member exists and is not already deleted
  const existingMember =
    await MyGlobal.prisma.community_platform_members.findUnique({
      where: {
        id: props.memberId,
        deleted_at: null,
      },
    });
  if (!existingMember) {
    throw new HttpException("Member not found or already deleted", 404);
  }
  // Verify requester is the member themselves
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account",
      403,
    );
  }
  // Soft-delete the member by setting deleted_at to current timestamp
  await MyGlobal.prisma.community_platform_members.update({
    where: {
      id: props.memberId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
