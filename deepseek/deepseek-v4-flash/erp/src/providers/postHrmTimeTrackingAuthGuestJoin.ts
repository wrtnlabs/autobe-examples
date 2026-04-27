import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthGuestJoin(props: {
  ip: string;
  body: IHrmTimeTrackingGuest.IJoin;
}): Promise<IHrmTimeTrackingGuest.IAuthorized> {
  // 1. Validate input
  if (!props.body.email || !props.body.email.includes("@")) {
    throw new HttpException("Invalid email format", 400);
  }
  if (!props.body.password) {
    throw new HttpException("Password is required", 400);
  }
  // 2. Normalize email and check duplicate
  const normalizedEmail = props.body.email.toLowerCase().trim();
  const existing = await MyGlobal.prisma.hrm_time_tracking_members.findFirst({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new HttpException("This email is already registered", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Derive display_name from email prefix (before '@')
  const displayName = props.body.email.split("@")[0];
  // 5. Compute timestamps using Date objects (toISOStringSafe accepts Date)
  const nowMs = Date.now();
  const now = toISOStringSafe(new Date(nowMs));
  const accessExpiresAt = toISOStringSafe(new Date(nowMs + 15 * 60 * 1000));
  const refreshExpiresAt = toISOStringSafe(
    new Date(nowMs + 30 * 24 * 60 * 60 * 1000),
  );
  // 6. Generate UUIDs
  const memberId: string & tags.Format<"uuid"> = v4() as any;
  const sessionId: string & tags.Format<"uuid"> = v4() as any;
  // 7. Create member record
  await MyGlobal.prisma.hrm_time_tracking_members.create({
    data: {
      id: memberId,
      email: normalizedEmail,
      password_hash: passwordHash,
      display_name: displayName,
      avatar: null,
      phone_number: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 8. Create member session with HTTP context
  await MyGlobal.prisma.hrm_time_tracking_member_sessions.create({
    data: {
      id: sessionId,
      hrm_time_tracking_member_id: memberId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpiresAt,
    },
  });
  // 9. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // 10. Return IAuthorized (no guest context available → empty values)
  return {
    id: memberId,
    device_fingerprint: "",
    sessions: [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  } satisfies IHrmTimeTrackingGuest.IAuthorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
// import { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingAuthGuestJoin(props: {
//   ip: string;
//   body: IHrmTimeTrackingGuest.IJoin;
// }): Promise<IHrmTimeTrackingGuest.IAuthorized> {
//   return {
//     id: ...,
//     device_fingerprint: ...,
//     sessions: await ArrayUtil.asyncMap(..., (r) => HrmTimeTrackingGuestSessionTransformer.transform(r)),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------