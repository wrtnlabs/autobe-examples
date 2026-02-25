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

export async function postCommunityPlatformUserPasswordResets(props: {
  user: UserPayload;
  body: ICommunityPlatformUserPasswordReset.ICreate;
}): Promise<ICommunityPlatformUserPasswordReset> {
  const email = props.body.email;
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { email, deleted_at: null },
    select: { id: true },
  });
  function generateIsoString(
    hoursToAdd: number,
  ): string & tags.Format<"date-time"> {
    return new Date(
      Date.now() + hoursToAdd * 3600000,
    ).toISOString() as unknown as string & tags.Format<"date-time">;
  }
  function generateUuid(): string & tags.Format<"uuid"> {
    return v4();
  }
  const now = generateIsoString(0);
  const expiresAt = generateIsoString(1);
  if (user === null) {
    return {
      id: generateUuid(),
      communityPlatformUserId: generateUuid(),
      token: "",
      expiresAt: now,
      used: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      user: undefined,
    };
  }
  const id = generateUuid();
  const token = generateUuid();
  const created =
    await MyGlobal.prisma.community_platform_user_password_resets.create({
      data: {
        id,
        community_platform_user_id: user.id,
        token,
        expires_at: expiresAt,
        used: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...CommunityPlatformUserPasswordResetTransformer.select(),
    });
  return await CommunityPlatformUserPasswordResetTransformer.transform(created);
}
