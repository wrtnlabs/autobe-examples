import { IEconomicBoardSystemOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemOverview";
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

export async function patchEconomicBoardSuperAdministratorAdminAdminRequestsRequestIdReject(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardSystemOverview> {
  // Find the admin request record with the given uuid and ensure status is pending
  const adminRequest =
    await MyGlobal.prisma.economic_board_administrators.findUniqueOrThrow({
      where: {
        id: props.requestId,
        admin_request_status: "pending",
      },
    });
  const now = new Date().toISOString();
  const timestamp = typia.assert<string & tags.Format<"date-time">>(now);
  // Create an audit log entry for rejection
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4(),
      action_type: "reject_admin_request",
      actor_id: props.superAdministrator.id,
      target_id: adminRequest.id,
      reason: "Request rejected by super administrator",
      created_at: timestamp,
      updated_at: timestamp,
      ip_address: "127.0.0.1",
    },
  });
  // Update the admin request status to 'rejected'
  await MyGlobal.prisma.economic_board_administrators.update({
    where: {
      id: props.requestId,
    },
    data: {
      admin_request_status: "rejected",
    },
  });
  // Return the system overview response
  return {
    version: MyGlobal.env.API_PORT ? "1.0.0" : "1.0.0", // Fallback version — actual version not available in MyGlobal.env per schema
    status: "online",
    links: {},
  } satisfies IEconomicBoardSystemOverview;
}
