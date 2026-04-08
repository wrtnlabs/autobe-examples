import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerSessionTransformer } from "../transformers/EcommerceMallCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminCustomerSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string;
}): Promise<IEcommerceMallCustomerSession> {
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...EcommerceMallCustomerSessionTransformer.select(),
    });
  return await EcommerceMallCustomerSessionTransformer.transform(session);
}
