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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCancellationRequestStatusTransformer } from "../transformers/EcommerceCancellationRequestStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorCancellationRequestsCancellationRequestIdStatusesStatusId(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationRequestStatus> {
  // Verify the cancellation request exists
  await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
    where: { id: props.cancellationRequestId },
  });
  // Retrieve the specific status record
  const statusRecord =
    await MyGlobal.prisma.ecommerce_cancellation_request_statuses.findUniqueOrThrow(
      {
        where: {
          id: props.statusId,
          ecommerce_cancellation_request_id: props.cancellationRequestId,
        },
        ...EcommerceCancellationRequestStatusTransformer.select(),
      },
    );
  // Transform and return the result
  return await EcommerceCancellationRequestStatusTransformer.transform(
    statusRecord,
  );
}
