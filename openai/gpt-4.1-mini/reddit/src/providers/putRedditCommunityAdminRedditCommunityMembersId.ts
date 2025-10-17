import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityMembersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityMember.IUpdate;
}): Promise<void> {
  const { admin, id, body } = props;

  // Step 1: Check member exists and not deleted
  const existingMember =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id },
    });

  if (!existingMember || existingMember.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }

  // Step 2: Check email uniqueness if updating email
  if (body.email !== undefined) {
    const emailInUse = await MyGlobal.prisma.reddit_community_members.findFirst(
      {
        where: {
          email: body.email,
          id: { not: id },
          deleted_at: null,
        },
      },
    );
    if (emailInUse) {
      throw new HttpException("Email already in use", 409);
    }
  }

  // Step 3: Prepare update data
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_community_members.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      is_email_verified: body.is_email_verified ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: now,
    },
  });
}
