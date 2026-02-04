import { IEconomicDiscussionAdministratorRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequestDecision";
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

export async function patchEconomicDiscussionSuperAdministratorAdministratorRequestsReject(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicDiscussionAdministratorRequestDecision;
}): Promise<void> {
  // Validate that request_id is provided in body
  const requestId = props.body.request_id;
  // Find the administrator request by ID
  const request =
    await MyGlobal.prisma.economic_discussion_administrator_requests.findUnique(
      {
        where: { id: requestId },
      },
    );
  // If request doesn't exist, throw 404
  if (!request) {
    throw new HttpException("Administrator request not found", 404);
  }
  // Check if request is already rejected or approved
  if (request.reason === "rejected") {
    throw new HttpException("Administrator request is not pending", 400);
  }
  // Update the request with rejection details
  await MyGlobal.prisma.economic_discussion_administrator_requests.update({
    where: { id: requestId },
    data: {
      reason: props.body.reason,
    },
  });
}
