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

export async function getEconomicDiscussionSuperAdministratorAdministratorRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionAdministratorRequest> {
  // Verify super administrator exists and is active
  const superAdmin =
    await MyGlobal.prisma.economic_discussion_super_administrators.findFirst({
      where: {
        id: props.superAdministrator.id,
        deleted_at: null,
      },
    });
  if (!superAdmin) {
    throw new HttpException(
      "Super administrator not found or deactivated",
      403,
    );
  }
  // Retrieve the administrator request with existing fields in schema
  const request =
    await MyGlobal.prisma.economic_discussion_administrator_requests.findUnique(
      {
        where: {
          id: props.requestId,
        },
        select: {
          id: true,
          created_at: true,
          reason: true,
          economic_discussion_citizen_id: true,
        },
      },
    );
  if (!request) {
    throw new HttpException("Administrator request not found", 404);
  }
  // Map to IEconomicDiscussionAdministratorRequest DTO with proper null handling
  return {
    requester_id: request.economic_discussion_citizen_id,
    reason: request.reason,
    status: "pending", // Based on schema and API contract, status is derived from request lifecycle
    submitted_at: toISOStringSafe(request.created_at),
    decision: undefined, // Not stored in database schema, so use undefined
  };
}
