import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformAdministratorSession> {
  const session =
    await MyGlobal.prisma.mall_platform_customer_sessions.findFirst({
      where: {
        id: props.sessionId,
        mall_platform_customer_id: props.customer.id,
      },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: session.id,
    administratorId: props.customer.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    createdAt: session.created_at.toISOString(),
    expiredAt: session.expired_at.toISOString(),
  };
}
