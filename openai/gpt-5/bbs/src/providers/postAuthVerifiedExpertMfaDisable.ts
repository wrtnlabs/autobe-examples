import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertMfaDisable } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaDisable";
import { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import { VerifiedexpertPayload } from "../decorators/payload/VerifiedexpertPayload";

export async function postAuthVerifiedExpertMfaDisable(props: {
  verifiedExpert: VerifiedexpertPayload;
  body: IEconDiscussVerifiedExpertMfaDisable.ICreate;
}): Promise<IEconDiscussVerifiedExpertMfa.IStatus> {
  const { verifiedExpert } = props;

  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: verifiedExpert.id },
  });
  if (!user) throw new HttpException("Not Found", 404);
  if (user.deleted_at !== null) throw new HttpException("Forbidden", 403);
  if (user.mfa_enabled !== true)
    throw new HttpException("Bad Request: MFA is not enabled", 400);

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: verifiedExpert.id },
    data: {
      mfa_enabled: false,
      mfa_secret: null,
      mfa_recovery_codes: null,
      updated_at: now,
    },
  });

  return {
    mfa_enabled: false,
    updated_at: now,
  };
}
