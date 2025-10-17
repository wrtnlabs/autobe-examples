import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getAuthSellerSessions(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSeller.ISessionList> {
  const { seller } = props;

  const sessions = await MyGlobal.prisma.shopping_mall_sessions.findMany({
    where: {
      seller_id: seller.id,
      user_type: "seller",
      is_revoked: false,
    },
    orderBy: {
      last_activity_at: "desc",
    },
  });

  const transformedSessions: IShoppingMallSession[] = sessions.map(
    (session) => ({
      id: session.id as string & tags.Format<"uuid">,
      user_type: session.user_type,
      refresh_token_expires_at: toISOStringSafe(
        session.refresh_token_expires_at,
      ),
      ip_address: session.ip_address,
      device_type: session.device_type ?? undefined,
      device_name: session.device_name ?? undefined,
      browser_name: session.browser_name ?? undefined,
      operating_system: session.operating_system ?? undefined,
      approximate_location: session.approximate_location ?? undefined,
      is_revoked: session.is_revoked,
      revoked_at: session.revoked_at
        ? toISOStringSafe(session.revoked_at)
        : undefined,
      last_activity_at: toISOStringSafe(session.last_activity_at),
      created_at: toISOStringSafe(session.created_at),
    }),
  );

  return {
    sessions: transformedSessions,
    total_count: transformedSessions.length,
  };
}
