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
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { EcommerceCustomerSessionTransformer } from "../transformers/EcommerceCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerSession> {
  const session =
    await MyGlobal.prisma.ecommerce_customer_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        ecommerce_customer_id: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        reviewHelpfulVotes: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer_id: true,
            review_id: true,
            customer_session_id: true,
          },
        },
      },
    });
  // Authorization check - session must belong to authenticated customer
  if (session.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform customer first
  const transformedCustomer =
    await EcommerceCustomerAtSummaryTransformer.transform(session.customer);
  // Convert string dates back to Date objects for session transformer compatibility
  const sessionData = {
    ...session,
    customer: {
      ...transformedCustomer,
      created_at: new Date(transformedCustomer.created_at),
    },
  };
  // Transform using the session transformer
  return await EcommerceCustomerSessionTransformer.transform(sessionData);
}
