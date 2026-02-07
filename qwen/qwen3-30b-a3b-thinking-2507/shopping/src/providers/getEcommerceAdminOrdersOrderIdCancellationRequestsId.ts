import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdCancellationRequestsId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequest> {
  const cancellation =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUnique({
      where: {
        id: props.id,
        order_id: props.orderId,
        deleted_at: null,
      },
      ...EcommerceCancellationRequestTransformer.select(),
    });
  if (!cancellation) {
    throw new HttpException("Cancellation request not found", 404);
  }
  return await EcommerceCancellationRequestTransformer.transform(cancellation);
}
