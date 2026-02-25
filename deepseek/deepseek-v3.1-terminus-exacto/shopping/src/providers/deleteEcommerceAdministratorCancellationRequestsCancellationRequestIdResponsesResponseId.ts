import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceAdministratorCancellationRequestsCancellationRequestIdResponsesResponseId(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify cancellation request exists and is not deleted
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
    });
  // Verify response exists and belongs to the cancellation request
  const responseRecord =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findUnique({
      where: {
        id: props.responseId,
        ecommerce_cancellation_request_id: props.cancellationRequestId,
      },
    });
  if (!responseRecord) {
    throw new HttpException(
      "Cancellation response not found or does not belong to the specified cancellation request",
      404,
    );
  }
  // Delete the response record
  await MyGlobal.prisma.ecommerce_cancellation_response_records.delete({
    where: { id: props.responseId },
  });
}
