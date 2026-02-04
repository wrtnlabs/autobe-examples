import { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
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

export async function patchEconomicDiscussionSuperAdministratorAdministratorRequestsApprove(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicDiscussionAdministratorRequest.IApprove;
}): Promise<IEconomicDiscussionAdministratorRequest.IApproveResponse> {
  // Find the first pending administrator request
  const request =
    await MyGlobal.prisma.economic_discussion_administrator_requests.findFirst({
      where: {
        // Use correct field name from schema: 'status'
        status: "pending",
      },
      orderBy: {
        created_at: "asc",
      },
    });
  if (!request) {
    throw new HttpException("No pending administrator requests found", 404);
  }
  // Update the administrator request status
  const updatedRequest =
    await MyGlobal.prisma.economic_discussion_administrator_requests.update({
      where: { id: request.id },
      data: {
        // Use correct field name from schema: 'status'
        status: "approved",
        reviewed_at: toISOStringSafe(new Date()),
        reviewed_by: props.superAdministrator.id,
        // Access body correctly
        reason: props.body.reason,
      },
    });
  // Update the citizen's role to administrator
  const updatedCitizen =
    await MyGlobal.prisma.economic_discussion_citizens.update({
      where: { id: request.economic_discussion_citizen_id },
      data: {
        // Use correct field name from schema: 'account_type'
        account_type: "administrator",
      },
    });
  // Return the approval response
  return {
    status: "approved",
    approvedAt: toISOStringSafe(new Date()),
    id: updatedRequest.id,
    userId: updatedCitizen.id,
  };
}
