import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformUserEmailVerificationCollector } from "../collectors/CommunityPlatformUserEmailVerificationCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserEmailVerificationTransformer } from "../transformers/CommunityPlatformUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserEmailVerifications(props: {
  user: UserPayload;
  body: ICommunityPlatformUserEmailVerification.ICreate;
}): Promise<ICommunityPlatformUserEmailVerification> {
  const user = await MyGlobal.prisma.community_platform_users.findUniqueOrThrow(
    {
      where: { id: props.user.id },
      select: { id: true },
    },
  );
  const now = new Date().toISOString();
  const existingVerification =
    await MyGlobal.prisma.community_platform_user_email_verifications.findFirst(
      {
        where: {
          user_id: user.id,
          expires_at: { gt: now },
          deleted_at: null,
        },
        ...CommunityPlatformUserEmailVerificationTransformer.select(),
      },
    );
  if (existingVerification) {
    return await CommunityPlatformUserEmailVerificationTransformer.transform(
      existingVerification,
    );
  }
  const createInput =
    await CommunityPlatformUserEmailVerificationCollector.collect({
      body: props.body,
      user: user,
    });
  const created =
    await MyGlobal.prisma.community_platform_user_email_verifications.create({
      data: createInput,
      ...CommunityPlatformUserEmailVerificationTransformer.select(),
    });
  return await CommunityPlatformUserEmailVerificationTransformer.transform(
    created,
  );
}
