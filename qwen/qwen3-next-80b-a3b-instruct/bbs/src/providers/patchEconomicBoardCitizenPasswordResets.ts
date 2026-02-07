import { IEconomicBoardCitizenPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizenPasswordReset";
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

export async function patchEconomicBoardCitizenPasswordResets(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardCitizenPasswordReset.IRequest;
}): Promise<IEconomicBoardCitizenPasswordReset.IResponse> {
  const citizenId = props.citizen.id;
  // Find any existing unexpired reset token for this citizen
  const existingToken =
    await MyGlobal.prisma.economic_board_citizen_password_resets.findFirst({
      where: {
        economic_board_citizen_id: citizenId,
        expires_at: {
          gte: toISOStringSafe(new Date()),
        },
      },
    });
  // If found, return existing token metadata
  if (existingToken) {
    return {
      token: existingToken.token satisfies string as string &
        tags.Format<"uuid">,
      expires_at: toISOStringSafe(existingToken.expires_at) as string &
        tags.Format<"date-time">,
    };
  }
  // Generate new 128-bit cryptographically secure token (exactly 128 bits)
  const newToken = v4();
  // Calculate expires_at as 24 hours from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // Create new password reset record
  const created =
    await MyGlobal.prisma.economic_board_citizen_password_resets.create({
      data: {
        id: v4(), // Add missing required id field
        economic_board_citizen_id: citizenId,
        token: newToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      },
    });
  // Return response with token and expiration
  return {
    token: created.token satisfies string as string & tags.Format<"uuid">,
    expires_at: toISOStringSafe(created.expires_at) as string &
      tags.Format<"date-time">,
  };
}
