import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberPasswordResetCollector } from "../collectors/CommunityPlatformMemberPasswordResetCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMemberPasswordResetTransformer } from "../transformers/CommunityPlatformMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPasswordResets(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMemberPasswordReset.ICreate;
}): Promise<ICommunityPlatformMemberPasswordReset> {
  try {
    const member =
      await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
        where: {
          email: props.body.email,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    const collected =
      await CommunityPlatformMemberPasswordResetCollector.collect({
        body: props.body,
        ip: props.body.ip ?? "0.0.0.0",
      });
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_platform_member_password_resets.updateMany({
        where: {
          community_platform_member_id: member.id,
          used_at: null,
          revoked_at: null,
          deleted_at: null,
          expired_at: {
            gt: new Date(),
          },
        },
        data: {
          revoked_at: new Date(),
          updated_at: new Date(),
        },
      });
      return await tx.community_platform_member_password_resets.create({
        data: collected,
        ...CommunityPlatformMemberPasswordResetTransformer.select(),
      });
    });
    return await CommunityPlatformMemberPasswordResetTransformer.transform(
      created,
    );
  } catch {
    throw new HttpException("Unable to create password reset request", 400);
  }
}
