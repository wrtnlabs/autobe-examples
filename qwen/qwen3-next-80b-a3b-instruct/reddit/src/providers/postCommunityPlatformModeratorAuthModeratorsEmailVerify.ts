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
import { ICommunityPlatformModeratorEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorEmailVerification";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorAuthModeratorsEmailVerify(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModeratorEmailVerification.IRequest;
}): Promise<void> {
  const token = (props.body as Record<string, any>).token as string | undefined;
  if (!token) {
    throw new HttpException("Verification token is required", 400);
  }
  if (!/^[a-zA-Z0-9-_]{32,64}$/.test(token)) {
    throw new HttpException("Invalid verification token format", 400);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const verification =
      await prisma.community_platform_moderator_email_verifications.findFirst({
        where: {
          token,
          consumed_at: null,
          expired_at: {
            gt: now,
          },
        },
      });
    if (!verification) {
      throw new HttpException("Invalid verification token", 400);
    }
    const moderator = await prisma.community_platform_moderators.findFirst({
      where: {
        id: verification.moderator_id,
        deleted_at: null,
      },
    });
    if (!moderator) {
      throw new HttpException("Invalid verification token", 400);
    }
    await prisma.community_platform_moderators.update({
      where: { id: moderator.id },
      data: {
        email_verified: true,
      },
    });
    await prisma.community_platform_moderator_email_verifications.update({
      where: { token },
      data: {
        consumed_at: now,
      },
    });
  });
}
