import { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicBoardSuperAdministratorAdminRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string;
  body: IEconomicBoardAdminRequest.IRequest;
}): Promise<IEconomicBoardAdminRequest> {
  const request =
    await MyGlobal.prisma.economic_board_admin_requests.findUnique({
      where: { id: props.requestId },
    });
  if (!request) {
    throw new HttpException("Request not found", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Request is not pending", 400);
  }
  // The IRequest DTO is empty, but operation specification requires status update.
  // Database schema confirms status is a string field with values 'pending', 'approved', 'rejected'.
  // Per operation specification, status must be 'approved' or 'rejected'.
  // Since the system provides no valid definition for IRequest.status, we must use type assertion.
  const status = typia.assert<"approved" | "rejected">(
    (props.body as any).status,
  );
  const updated = await MyGlobal.prisma.economic_board_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status,
      processed_by_id: props.superAdministrator.id,
      processed_at: toISOStringSafe(new Date()),
    },
  });
  // Transform database record to IEconomicBoardAdminRequest using exact schema field names
  return {
    id: updated.id,
    requester_id: updated.requester_id,
    processed_by_id: updated.processed_by_id,
    status: updated.status,
    reason_text: updated.reason_text,
    created_at: toISOStringSafe(updated.created_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
  };
}
