import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMemberPasswordResetTransformer } from "../transformers/CommunityPlatformMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPasswordResetsResetId(props: {
  admin: AdminPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMemberPasswordReset> {
  const record =
    await MyGlobal.prisma.community_platform_member_password_resets.findUniqueOrThrow(
      {
        where: { token: props.resetId },
        ...CommunityPlatformMemberPasswordResetTransformer.select(),
      },
    );
  return await CommunityPlatformMemberPasswordResetTransformer.transform(
    record,
  );
}
