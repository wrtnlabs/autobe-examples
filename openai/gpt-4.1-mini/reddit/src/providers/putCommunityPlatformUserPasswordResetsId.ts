import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserPasswordResetTransformer } from "../transformers/CommunityPlatformUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPasswordResetsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserPasswordReset.IUpdate;
}): Promise<ICommunityPlatformUserPasswordReset> {
  await MyGlobal.prisma.community_platform_user_password_resets.findUniqueOrThrow(
    {
      where: { id: props.id },
    },
  );
  await MyGlobal.prisma.community_platform_user_password_resets.update({
    where: { id: props.id },
    data: {
      token: props.body.token,
      expires_at: props.body.expiresAt,
      used: props.body.used,
      community_platform_user_id: props.body.communityPlatformUserId,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_user_password_resets.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...CommunityPlatformUserPasswordResetTransformer.select(),
      },
    );
  return await CommunityPlatformUserPasswordResetTransformer.transform(updated);
}
