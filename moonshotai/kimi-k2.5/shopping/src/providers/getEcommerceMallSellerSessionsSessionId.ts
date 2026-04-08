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
import { EcommerceMallSellerSessionTransformer } from "../transformers/EcommerceMallSellerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSessionsSessionId(props: {
  seller: SellerPayload;
  sessionId: string;
}): Promise<IEcommerceMallSellerSession> {
  const session =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.findUnique({
      where: { id: props.sessionId },
      ...EcommerceMallSellerSessionTransformer.select(),
    });
  if (session === null) {
    throw new HttpException("Not Found", 404);
  }
  if (session.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerSessionTransformer.transform(session);
}
