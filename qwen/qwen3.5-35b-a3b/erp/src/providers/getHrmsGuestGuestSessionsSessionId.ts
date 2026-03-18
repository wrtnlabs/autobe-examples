import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmsGuestSessionTransformer } from "../transformers/HrmsGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsGuestGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmsGuestSession> {
  if (props.guest.session_id !== props.sessionId) {
    throw new HttpException("Forbidden", 403);
  }
  const session = await MyGlobal.prisma.hrms_guest_sessions.findUniqueOrThrow({
    where: { id: props.sessionId },
    ...HrmsGuestSessionTransformer.select(),
  });
  const expiredAt = session.expired_at;
  const now = new Date();
  if (expiredAt < now) {
    throw new HttpException("Session expired", 410);
  }
  return await HrmsGuestSessionTransformer.transform(session);
}
