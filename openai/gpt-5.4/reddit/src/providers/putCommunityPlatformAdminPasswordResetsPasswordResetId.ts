import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminPasswordResetsPasswordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
  body: ICommunityPlatformMemberPasswordReset.IUpdate;
}): Promise<ICommunityPlatformMember> {
  const passwordReset =
    await MyGlobal.prisma.community_platform_member_password_resets.findUniqueOrThrow(
      {
        where: { id: props.passwordResetId },
        select: {
          id: true,
          token: true,
          expired_at: true,
          used_at: true,
          revoked_at: true,
          deleted_at: true,
          community_platform_member_id: true,
        },
      },
    );
  if (passwordReset.deleted_at !== null) {
    throw new HttpException("Password reset request is no longer usable", 400);
  }
  if (passwordReset.used_at !== null) {
    throw new HttpException("Password reset request is no longer usable", 400);
  }
  if (passwordReset.revoked_at !== null) {
    throw new HttpException("Password reset request is no longer usable", 400);
  }
  if (passwordReset.expired_at.getTime() < new Date().getTime()) {
    throw new HttpException("Password reset request is no longer usable", 400);
  }
  if (passwordReset.token !== props.body.token) {
    throw new HttpException("Invalid recovery payload", 400);
  }
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: passwordReset.community_platform_member_id },
    select: { id: true },
  });
  if (member === null) {
    throw new HttpException("Password reset request is invalid", 400);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const consumed =
      await tx.community_platform_member_password_resets.updateMany({
        where: {
          id: props.passwordResetId,
          token: props.body.token,
          deleted_at: null,
          used_at: null,
          revoked_at: null,
          expired_at: {
            gt: now,
          },
          community_platform_member_id:
            passwordReset.community_platform_member_id,
        },
        data: {
          used_at: now,
          updated_at: now,
        },
      });
    if (consumed.count !== 1) {
      throw new HttpException(
        "Password reset request is no longer usable",
        400,
      );
    }
    await tx.community_platform_members.update({
      where: { id: passwordReset.community_platform_member_id },
      data: {
        password_hash: passwordHash,
        updated_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: passwordReset.community_platform_member_id },
      ...CommunityPlatformMemberTransformer.select(),
    });
  return await CommunityPlatformMemberTransformer.transform(updated);
}
