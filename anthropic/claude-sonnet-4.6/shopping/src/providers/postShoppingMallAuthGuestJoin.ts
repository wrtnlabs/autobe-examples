import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallGuestSessionTransformer } from "../transformers/ShoppingMallGuestSessionTransformer";
import { ShoppingMallGuestTransformer } from "../transformers/ShoppingMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestJoin(props: {
  ip: string;
  body: IShoppingMallGuest.IJoin;
}): Promise<IShoppingMallGuest.IAuthorized> {
  // 1. Find or create guest by fingerprint token (unique constraint)
  const existingGuest = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { token: props.body.token },
    select: { id: true },
  });
  let guestId: string;
  if (existingGuest !== null) {
    guestId = existingGuest.id;
  } else {
    const created = await MyGlobal.prisma.shopping_mall_guests.create({
      data: {
        id: v4(),
        token: props.body.token,
        created_at: new Date(),
      },
      select: { id: true },
    });
    guestId = created.id;
  }
  // 2. Compute expiry timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ip = props.body.ip ?? props.ip;
  // 3. Create a new guest session
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: v4(),
      guest: { connect: { id: guestId } },
      ip: ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
    ...ShoppingMallGuestSessionTransformer.select(),
  });
  // 4. Load full guest record (includes newly created session)
  const guestRecord =
    await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
      where: { id: guestId },
      ...ShoppingMallGuestTransformer.select(),
    });
  const guestDto = await ShoppingMallGuestTransformer.transform(guestRecord);
  // 5. Generate JWT tokens
  const nowIso: string = now.toISOString();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const authorizationToken: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return authorized guest response
  return {
    id: guestDto.id,
    token: authorizationToken,
    sessions: guestDto.sessions,
    created_at: guestDto.created_at,
    guest: guestDto,
  } satisfies IShoppingMallGuest.IAuthorized;
}
