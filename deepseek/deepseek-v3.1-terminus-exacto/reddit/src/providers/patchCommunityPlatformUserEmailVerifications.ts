import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserEmailVerificationTransformer } from "../transformers/CommunityPlatformUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserEmailVerifications(props: {
  user: UserPayload;
  body: ICommunityPlatformUserEmailVerification.IRequest;
}): Promise<ICommunityPlatformUserEmailVerification> {
  // Find verification record by token
  const verification =
    await MyGlobal.prisma.community_platform_user_email_verifications.findFirst(
      {
        where: { token: props.body.token },
        ...CommunityPlatformUserEmailVerificationTransformer.select(),
      },
    );
  if (!verification) {
    throw new HttpException("Invalid verification token", 400);
  }
  const currentTime = new Date().toISOString();
  // Check if token is already verified
  if (verification.verified_at) {
    throw new HttpException("Email already verified", 400);
  }
  // Check if token is expired
  if (verification.expires_at.toISOString() < currentTime) {
    throw new HttpException("Verification token expired", 410);
  }
  // Update verification record with current timestamp
  const updated =
    await MyGlobal.prisma.community_platform_user_email_verifications.update({
      where: { id: verification.id },
      data: {
        verified_at: new Date(currentTime),
        updated_at: new Date(currentTime),
      },
      ...CommunityPlatformUserEmailVerificationTransformer.select(),
    });
  return await CommunityPlatformUserEmailVerificationTransformer.transform(
    updated,
  );
}
