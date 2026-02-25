import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserUsersEmailVerifications(props: {
  user: UserPayload;
  body: IDiscussionBoardUserEmailVerification.IRequest;
}): Promise<IDiscussionBoardUserEmailVerification.IResponse> {
  const { user, body } = props;
  const now = new Date().toISOString();
  // Find verification record by token
  const verificationRecord =
    await MyGlobal.prisma.discussion_board_user_email_verifications.findFirst({
      where: {
        token: body.token,
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          },
        },
      },
    });
  if (!verificationRecord) {
    return {
      success: false,
      user: null,
      verified_at: null,
      created_at: now,
    };
  }
  // Check if token is already verified
  if (verificationRecord.verified_at) {
    return {
      success: false,
      user: null,
      verified_at: toISOStringSafe(verificationRecord.verified_at),
      created_at: toISOStringSafe(verificationRecord.created_at),
    };
  }
  // Check if token is expired
  if (verificationRecord.expires_at.toISOString() < now) {
    return {
      success: false,
      user: null,
      verified_at: null,
      created_at: toISOStringSafe(verificationRecord.created_at),
    };
  }
  // Update verification record with verification timestamp
  const verifiedRecord =
    await MyGlobal.prisma.discussion_board_user_email_verifications.update({
      where: { id: verificationRecord.id },
      data: {
        verified_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          },
        },
      },
    });
  return {
    success: true,
    user: {
      id: verifiedRecord.user.id as string & tags.Format<"uuid">,
      display_name: verifiedRecord.user.display_name,
      bio: verifiedRecord.user.bio ?? null,
      created_at: toISOStringSafe(verifiedRecord.user.created_at),
    } satisfies IDiscussionBoardUser.ISummary,
    verified_at: toISOStringSafe(verifiedRecord.verified_at!),
    created_at: toISOStringSafe(verifiedRecord.created_at),
  };
}
