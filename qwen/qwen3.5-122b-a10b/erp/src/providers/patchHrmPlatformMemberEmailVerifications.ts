import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformMemberEmailVerificationTransformer } from "../transformers/HrmPlatformMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmPlatformMemberEmailVerification.IVerify;
}): Promise<IHrmPlatformMemberEmailVerification> {
  const now = new Date();
  const record =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findFirst({
      where: {
        token: props.body.token,
        deleted_at: null,
      },
      ...HrmPlatformMemberEmailVerificationTransformer.select(),
    });
  if (record === null) {
    throw new HttpException("Token not found", 404);
  }
  if (record.expires_at <= now) {
    throw new HttpException("Token has expired", 410);
  }
  if (record.verified_at !== null) {
    throw new HttpException("Token already verified", 409);
  }
  await MyGlobal.prisma.hrm_platform_member_email_verifications.update({
    where: {
      id: record.id,
    },
    data: {
      verified_at: now,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findUniqueOrThrow(
      {
        where: { id: record.id },
        ...HrmPlatformMemberEmailVerificationTransformer.select(),
      },
    );
  return await HrmPlatformMemberEmailVerificationTransformer.transform(updated);
}
