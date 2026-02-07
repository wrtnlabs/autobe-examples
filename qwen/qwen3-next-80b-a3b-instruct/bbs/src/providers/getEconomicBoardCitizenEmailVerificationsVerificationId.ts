import { IEconomicBoardCitizenEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizenEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardCitizenEmailVerificationsVerificationId(props: {
  citizen: CitizenPayload;
  verificationId: string;
}): Promise<IEconomicBoardCitizenEmailVerification> {
  const verification =
    await MyGlobal.prisma.economic_board_citizen_email_verifications.findUnique(
      {
        where: {
          token: props.verificationId,
          used_at: null,
          expires_at: { gt: new Date() },
        },
      },
    );
  if (!verification) {
    throw new HttpException("VERIFICATION_NOT_FOUND", 404);
  }
  if (verification.expires_at < new Date()) {
    throw new HttpException("VERIFICATION_EXPIRED", 404);
  }
  if (verification.used_at !== null) {
    throw new HttpException("VERIFICATION_ALREADY_USED", 404);
  }
  // Update used_at to current timestamp
  await MyGlobal.prisma.economic_board_citizen_email_verifications.update({
    where: { token: props.verificationId },
    data: { used_at: toISOStringSafe(new Date()) },
  });
  return {
    id: verification.id as string & tags.Format<"uuid">,
    citizen_id: verification.citizen_id as string & tags.Format<"uuid">,
    token: verification.token,
    expires_at: toISOStringSafe(verification.expires_at) as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(verification.created_at) as string &
      tags.Format<"date-time">,
    used_at: verification.used_at
      ? (toISOStringSafe(verification.used_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
