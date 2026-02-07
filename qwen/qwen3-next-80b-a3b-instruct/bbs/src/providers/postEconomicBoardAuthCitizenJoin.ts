import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAuthCitizenJoin(props: {
  body: IEconomicBoardCitizen.IJoin;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create citizen account
  const citizenId = v4();
  const citizen = await MyGlobal.prisma.economic_board_citizens.create({
    data: {
      id: citizenId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      is_verified: false,
      is_banned: false,
    },
  });
  // 3. Generate and store email verification token
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const verificationId = v4();
  await MyGlobal.prisma.economic_board_citizen_email_verifications.create({
    data: {
      id: verificationId,
      citizen_id: citizen.id,
      token: verificationToken,
      expires_at: toISOStringSafe(expiresAt),
      created_at: toISOStringSafe(new Date()),
      used_at: null,
    },
  });
  // 4. Return IAuthorized with empty token fields but correct structure
  // According to specification, no access token is issued until verification
  // but the IAuthorized type requires token property of IAuthorizationToken type
  // We must return compliant structure, so create dummy values with correct type
  const token: IAuthorizationToken = {
    access: "",
    refresh: "",
    expired_at: toISOStringSafe(new Date(0)),
    refreshable_until: toISOStringSafe(new Date(0)),
  } satisfies IAuthorizationToken;
  return {
    id: citizen.id,
    token,
  } satisfies IEconomicBoardCitizen.IAuthorized;
}
