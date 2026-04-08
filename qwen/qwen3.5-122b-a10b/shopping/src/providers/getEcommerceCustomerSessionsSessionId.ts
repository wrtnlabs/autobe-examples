import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerSessionTransformer } from "../transformers/EcommerceCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerSession> {
  const record =
    await MyGlobal.prisma.ecommerce_customer_sessions.findFirstOrThrow({
      ...EcommerceCustomerSessionTransformer.select(),
      where: {
        id: props.sessionId,
        ecommerce_customer_id: props.customer.id,
      },
    });
  return await EcommerceCustomerSessionTransformer.transform(record);
}
