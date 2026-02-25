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

export async function deleteEcommerceAdministratorRefundRequestsRefundRequestIdResponsesResponseId(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the response exists and belongs to the specified refund request
  const response =
    await MyGlobal.prisma.ecommerce_refund_response_records.findUnique({
      where: { id: props.responseId },
      select: { id: true, ecommerce_refund_request_id: true },
    });
  if (!response) {
    throw new HttpException("Refund response not found", 404);
  }
  // Verify the response belongs to the specified refund request
  if (response.ecommerce_refund_request_id !== props.refundRequestId) {
    throw new HttpException(
      "Refund response does not belong to the specified refund request",
      400,
    );
  }
  // Perform hard delete
  await MyGlobal.prisma.ecommerce_refund_response_records.delete({
    where: { id: props.responseId },
  });
}
