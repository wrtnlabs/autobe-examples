import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussVerifiedExpertMfaRecovery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaRecovery";
import { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import { VerifiedexpertPayload } from "../decorators/payload/VerifiedexpertPayload";

export async function postAuthVerifiedExpertMfaRecoveryCodes(props: {
  verifiedExpert: VerifiedexpertPayload;
  body: IEconDiscussVerifiedExpertMfaRecovery.ICreate;
}): Promise<IEconDiscussVerifiedExpertMfa.IRecoveryCodes> {
  const { verifiedExpert } = props;

  const user = await MyGlobal.prisma.econ_discuss_users.findUniqueOrThrow({
    where: { id: verifiedExpert.id },
    select: {
      id: true,
      mfa_enabled: true,
      mfa_secret: true,
    },
  });

  if (!user.mfa_enabled || user.mfa_secret === null) {
    throw new HttpException(
      "MFA must be enabled before regenerating recovery codes",
      403,
    );
  }

  const desiredCount = 8;
  const codes: (string & tags.Pattern<"^[A-Za-z0-9-]{8,64}$">)[] = [];
  while (codes.length < desiredCount) {
    const candidate = typia.random<
      string & tags.Pattern<"^[A-Za-z0-9-]{8,64}$">
    >();
    if (!codes.includes(candidate)) codes.push(candidate);
  }

  const hashedCodes = await Promise.all(codes.map((c) => PasswordUtil.hash(c)));
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: user.id },
    data: {
      mfa_recovery_codes:
        hashedCodes.join(
          "\
",
        ),
      updated_at: now,
    },
  });

  return typia.assert<IEconDiscussVerifiedExpertMfa.IRecoveryCodes>({ codes });
}
