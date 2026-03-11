import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSessionsSessionId(props: {
  seller: SellerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerSession> {
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        seller_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    });
  if (session.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: session.id,
    seller: await EcommerceMallSellerAtSummaryTransformer.transform(
      session.seller,
    ),
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: session.created_at.toISOString() as string &
      tags.Format<"date-time">,
    expired_at: session.expired_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
