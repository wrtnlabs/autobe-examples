import { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardMemberPasswordResetAtSummaryTransformer } from "../transformers/DiscussionBoardMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberPasswordReset.ISummary> {
  // Find the password reset record by ID with soft delete filter
  // Select only necessary fields for validation (exclude token for security)
  const record =
    await MyGlobal.prisma.discussion_board_member_password_resets.findUniqueOrThrow(
      {
        where: {
          id: props.resetId,
          deleted_at: null,
        },
        select: {
          id: true,
          discussion_board_member_id: true,
          expires_at: true,
          used_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
            },
          } satisfies Prisma.discussion_board_membersFindManyArgs,
        },
      },
    );
  // Verify ownership - the reset must belong to the authenticated member
  if (record.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the token has expired
  const now = new Date();
  if (record.expires_at < now) {
    throw new HttpException("Token has expired", 404);
  }
  // Check if the token has already been used
  if (record.used_at !== null) {
    throw new HttpException("Token has already been used", 404);
  }
  // Transform and return the response using the transformer
  // The transformer will handle date-to-string conversion
  return await DiscussionBoardMemberPasswordResetAtSummaryTransformer.transform(
    {
      ...record,
      token: "", // Token not selected, provide empty string to satisfy transformer payload type
    } as typeof record & {
      token: string;
    },
  );
}
