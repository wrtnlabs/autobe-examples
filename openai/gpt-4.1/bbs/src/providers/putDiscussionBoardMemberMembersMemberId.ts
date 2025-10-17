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

export async function putDiscussionBoardMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { member, memberId, body } = props;

  // Fetch and ensure member exists and not soft-deleted
  const record = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { id: memberId },
  });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Member not found or deleted", 404);
  }

  // Authorization: only allow if editing self
  if (member.id !== memberId) {
    throw new HttpException("You can only modify your own profile.", 403);
  }

  // Prepare update object from input
  const updates: {
    email?: string;
    username?: string;
    email_verified?: boolean;
    registration_completed_at?: string;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Handle email update (reset verification as required)
  if (body.email !== undefined && body.email !== record.email) {
    updates.email = body.email;
    updates.email_verified = false;
  }
  // Username
  if (body.username !== undefined && body.username !== record.username) {
    updates.username = body.username;
  }
  // registration_completed_at (for completeness, likely not updatable by end-user)
  if (body.registration_completed_at !== undefined) {
    updates.registration_completed_at = toISOStringSafe(
      body.registration_completed_at,
    );
  }

  // Only update if at least one field changes
  if (Object.keys(updates).length === 1) {
    // Only updated_at present, nothing to update
    return {
      id: record.id,
      email: record.email,
      username: record.username,
      email_verified: record.email_verified,
      registration_completed_at: toISOStringSafe(
        record.registration_completed_at,
      ),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at !== null
          ? toISOStringSafe(record.deleted_at)
          : undefined,
    };
  }

  // Attempt update, handle unique constraint errors
  try {
    const updated = await MyGlobal.prisma.discussion_board_members.update({
      where: { id: memberId },
      data: updates,
    });
    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      email_verified: updated.email_verified,
      registration_completed_at: toISOStringSafe(
        updated.registration_completed_at,
      ),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at !== null
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      // Unique constraint failure
      const meta = (err as any).meta;
      const fields = meta?.target || [];
      if (fields.includes("email")) {
        throw new HttpException("Email already exists", 409);
      }
      if (fields.includes("username")) {
        throw new HttpException("Username already exists", 409);
      }
      throw new HttpException("Unique constraint error", 409);
    }
    throw err;
  }
}
