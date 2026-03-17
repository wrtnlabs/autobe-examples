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
import { ShoppingMallGuestTransformer } from "../transformers/ShoppingMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestRefresh(props: {
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  // 1. Verify and decode the refresh token — no 'as' assertion
  let decoded: jwt.JwtPayload;
  try {
    const result = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof result === "string" ||
      !result ||
      typeof result["type"] !== "string" ||
      typeof result["id"] !== "string" ||
      typeof result["session_id"] !== "string"
    ) {
      throw new HttpException("Invalid token payload", 401);
    }
    decoded = result;
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded["type"] !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  const guestId: string = decoded["id"];
  const sessionId: string = decoded["session_id"];
  // 3. Validate session exists and is not expired
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: sessionId,
      shopping_mall_guest_id: guestId,
    },
    select: {
      id: true,
      shopping_mall_guest_id: true,
      expired_at: true,
    },
  });
  if (!session || session.expired_at.getTime() < Date.now()) {
    throw new HttpException("Session expired or not found", 401);
  }
  // 4. Validate guest exists
  await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: guestId },
    select: { id: true },
  });
  // 5. Create a new guest session
  const newSessionId = v4();
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: newSessionId,
      shopping_mall_guest_id: guestId,
      ip: "",
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: refreshExpiresDate,
    },
  });
  // 6. Generate new JWT tokens using the new session id
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: newSessionId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: newSessionId,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Load full guest record (with all sessions, including newly created) via transformer
  const guestRecord =
    await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
      where: { id: guestId },
      ...ShoppingMallGuestTransformer.select(),
    });
  const guest = await ShoppingMallGuestTransformer.transform(guestRecord);
  // 8. Build the authorization token response
  const authToken: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresDate.toISOString(),
    refreshable_until: refreshExpiresDate.toISOString(),
  };
  // 9. Return the authorized guest response
  return {
    id: guest.id,
    token: authToken,
    sessions: guest.sessions,
    created_at: guest.created_at,
    guest,
  };
}
