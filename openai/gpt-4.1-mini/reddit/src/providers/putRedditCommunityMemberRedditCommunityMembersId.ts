import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditCommunityMemberRedditCommunityMembersId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityMember.IUpdate;
}): Promise<void> {
  const { member, id, body } = props;

  if (member.id !== id) {
    throw new HttpException(
      "Forbidden: You can only update your own member profile",
      403,
    );
  }

  const existingMember =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id },
    });
  if (!existingMember) {
    throw new HttpException("Member not found", 404);
  }

  if (body.email !== undefined && body.email !== existingMember.email) {
    const emailUsed = await MyGlobal.prisma.reddit_community_members.findFirst({
      where: {
        email: body.email,
        id: { not: id },
        deleted_at: null,
      },
    });
    if (emailUsed) {
      throw new HttpException("Conflict: Email already in use", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_community_members.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      is_email_verified: body.is_email_verified ?? undefined,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
      updated_at: now,
    },
  });
  return;
}
