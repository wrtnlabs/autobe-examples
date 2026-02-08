import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

export async function postDiscussionBoardAuthGuestJoin(props: {
  body: IDiscussionBoardGuest.IJoin;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // Generate new UUIDs for guest ID and anonymous ID
  const guestId = v4();
  const anonymousId = v4();
  // Since IJoin type is empty, required guest metadata must be retrieved from environment or headers not present in props
  // Logistics prevent proceeding without these - throw error to indicate this
  throw new HttpException(
    "Required guest metadata missing: device fingerprint, user agent, IP address",
    400,
  );
  // If input exists, the following would be correct to create guest
  // const now = toISOStringSafe(new Date());
  // const createdGuest = await MyGlobal.prisma.discussion_board_guests.create({
  //   data: {
  //     id: guestId,
  //     device_fingerprint: props.body.device_fingerprint,
  //     user_agent: props.body.user_agent,
  //     ip_address: props.body.ip_address,
  //     anonymous_id: anonymousId,
  //     created_at: now,
  //     updated_at: now,
  //     deleted_at: null,
  //   },
  // });
  // const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  // const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // const token = {
  //   access: jwt.sign({
  //     type: "guest",
  //     id: createdGuest.id,
  //     session_id: createdGuest.id,
  //     created_at: toISOStringSafe(new Date()),
  //   }, MyGlobal.env.JWT_SECRET_KEY, { expiresIn: "1h", issuer: "autobe" }),
  //   refresh: jwt.sign({
  //     type: "guest",
  //     id: createdGuest.id,
  //     session_id: createdGuest.id,
  //     tokenType: "refresh",
  //     created_at: toISOStringSafe(new Date()),
  //   }, MyGlobal.env.JWT_SECRET_KEY, { expiresIn: "7d", issuer: "autobe" }),
  //   expired_at: toISOStringSafe(accessExpires),
  //   refreshable_until: toISOStringSafe(refreshExpires),
  // };
  // return { token };
}
