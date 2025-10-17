import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberMfaVerify(props: {
  member: MemberPayload;
  body: IEconDiscussMember.IMfaVerify;
}): Promise<IEconDiscussMember.IMfaEnabled> {
  const { member, body } = props;

  const user = await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
    where: {
      id: member.id,
      deleted_at: null,
    },
  });

  if (user.mfa_secret === null || user.mfa_secret === undefined) {
    throw new HttpException("MFA setup not initialized", 400);
  }

  if (user.mfa_enabled === true) {
    return {
      mfa_enabled: true,
    };
  }

  const hasCode = body?.code !== undefined && body?.code !== null;
  const hasRecovery =
    body?.recovery_code !== undefined && body?.recovery_code !== null;
  if ((hasCode && hasRecovery) || (!hasCode && !hasRecovery)) {
    throw new HttpException(
      "Provide exactly one of 'code' or 'recovery_code'",
      400,
    );
  }

  throw new HttpException("Invalid verification code", 400);
}
