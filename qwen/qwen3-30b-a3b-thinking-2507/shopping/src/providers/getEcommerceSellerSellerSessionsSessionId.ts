import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceSellerSessionTransformer } from "../transformers/EcommerceSellerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerSellerSessionsSessionId(props: {
  seller: SellerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSellerSession> {
  const session = await MyGlobal.prisma.ecommerce_seller_sessions.findUnique({
    where: { id: props.sessionId },
    ...EcommerceSellerSessionTransformer.select(),
  });
  if (!session) throw new HttpException("Session not found", 404);
  return await EcommerceSellerSessionTransformer.transform(session);
}
