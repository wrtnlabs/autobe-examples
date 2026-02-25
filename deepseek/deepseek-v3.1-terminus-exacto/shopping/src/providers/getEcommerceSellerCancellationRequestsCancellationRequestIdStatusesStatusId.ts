import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCancellationRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestStatus";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestStatusTransformer } from "../transformers/EcommerceCancellationRequestStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerCancellationRequestsCancellationRequestIdStatusesStatusId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestStatus> {
  // Retrieve the status record with seller verification in a single query
  const statusRecord =
    await MyGlobal.prisma.ecommerce_cancellation_request_statuses.findFirstOrThrow(
      {
        where: {
          id: props.statusId,
          ecommerce_cancellation_request_id: props.cancellationRequestId,
          cancellationRequest: {
            seller: {
              id: props.seller.id,
              account_status: "active",
              deleted_at: null,
            },
          },
        },
        ...EcommerceCancellationRequestStatusTransformer.select(),
      },
    );
  return await EcommerceCancellationRequestStatusTransformer.transform(
    statusRecord,
  );
}
