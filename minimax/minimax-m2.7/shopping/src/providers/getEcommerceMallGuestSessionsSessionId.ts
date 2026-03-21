import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallGuestSessionTransformer } from "../transformers/EcommerceMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallGuestSessionsSessionId(props: {
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallGuestSession> {
  // Query the session by ID with guest details using transformer
  const session =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...EcommerceMallGuestSessionTransformer.select(),
    });
  // Verify the session has not expired
  if (session.expired_at < new Date()) {
    throw new HttpException("Session expired", 404);
  }
  // Transform and return the session data
  return await EcommerceMallGuestSessionTransformer.transform(session);
}
