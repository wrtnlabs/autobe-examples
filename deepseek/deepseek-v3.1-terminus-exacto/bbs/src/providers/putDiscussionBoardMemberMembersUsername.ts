import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberMembersUsername(props: {
  member: MemberPayload;
  username: string;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  // Verify the target member exists
  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }

  // Verify authorization - only the member themselves can update their profile
  if (targetMember.id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  // Check if any fields are being updated
  const hasUpdates =
    props.body.email !== undefined ||
    props.body.password !== undefined ||
    props.body.display_name !== undefined ||
    props.body.bio !== undefined;

  if (!hasUpdates) {
    throw new HttpException("No fields to update", 400);
  }

  try {
    // Perform the update with inline data construction
    const updatedMember = await MyGlobal.prisma.discussion_board_members.update(
      {
        where: { id: targetMember.id },
        data: {
          ...(props.body.email !== undefined && { email: props.body.email }),
          ...(props.body.password !== undefined && {
            password_hash: await PasswordUtil.hash(props.body.password),
          }),
          ...(props.body.display_name !== undefined && {
            display_name:
              props.body.display_name === null ? null : props.body.display_name,
          }),
          ...(props.body.bio !== undefined && {
            bio: props.body.bio === null ? null : props.body.bio,
          }),
          updated_at: toISOStringSafe(new Date()),
        },
      },
    );

    // Return the updated member profile with proper null/undefined handling
    return {
      id: updatedMember.id,
      email: updatedMember.email,
      username: updatedMember.username,
      display_name: updatedMember.display_name ?? undefined,
      bio: updatedMember.bio ?? undefined,
      created_at: toISOStringSafe(updatedMember.created_at),
      updated_at: toISOStringSafe(updatedMember.updated_at),
      deleted_at: updatedMember.deleted_at
        ? toISOStringSafe(updatedMember.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation (likely email)
      throw new HttpException("Email already exists", 409);
    }
    throw error;
  }
}
