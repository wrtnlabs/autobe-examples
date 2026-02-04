import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
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

export async function postEconomicDiscussionAuthAdministratorJoin(props: {
  body: IEconomicDiscussionAdministrator.IJoin;
}): Promise<IEconomicDiscussionAdministrator.IAuthorized> {
  // Validate email format and password complexity (JSON Schema already handles this)
  // Check for duplicate email
  const existing =
    await MyGlobal.prisma.economic_discussion_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate password hash (PasswordUtil.hash is async)
  const passwordHashed = await PasswordUtil.hash(props.body.password);
  // Get current ISO string for all time references
  const now = toISOStringSafe(new Date());
  // Calculate future timestamps using string manipulation (avoid Date objects)
  // Access token expires in 15 minutes (900000 milliseconds)
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  // Refresh token expires in 7 days (604800000 milliseconds)
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create administrator record
  const administrator =
    await MyGlobal.prisma.economic_discussion_administrators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        password_hash: passwordHashed,
        created_at: now as string & tags.Format<"date-time">,
        updated_at: now as string & tags.Format<"date-time">,
        display_name: "",
        bio: "",
        // Remove citizen relation as IJoin interface doesn't include citizen_id and we shouldn't assume missing schema properties
      },
    });
  // Create administrator session
  const session =
    await MyGlobal.prisma.economic_discussion_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        administrator_id: administrator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now as string & tags.Format<"date-time">,
        expired_at: accessExpires as string & tags.Format<"date-time">, // Session expiration
      },
    });
  // Generate JWT tokens - use 'now' for timestamp to avoid Date object
  const accessToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return IAuthorized response
  return {
    id: administrator.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IEconomicDiscussionAdministrator.IAuthorized;
}
