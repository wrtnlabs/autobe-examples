import { IEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionAdministratorRequest";
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

export async function getEconomicDiscussionSuperAdministratorAdministratorRequestsPending(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIEconomicDiscussionAdministratorRequest> {
  // Default pagination values as specified
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query for pending administrator requests with citizen details
  // Status is pending when no decision records exist
  const requests =
    await MyGlobal.prisma.economic_discussion_administrator_requests.findMany({
      where: {
        // Look for requests that do NOT have any corresponding entries in the decision table
        // Use the inverse relationship: check that the request_id is not present in the decision table
        economic_discussion_administrator_request_decisions: {
          none: {
            economic_discussion_administrator_request_id: {
              contains: "", // This is just a placeholder - we want no matching records
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        economic_discussion_citizen_id: true,
        reason: true,
        created_at: true,
        citizen: {
          select: {
            // Use actual field name from schema
            user_name: true,
          },
        },
      },
    });
  // Count total pending requests
  const total =
    await MyGlobal.prisma.economic_discussion_administrator_requests.count({
      where: {
        // Same condition as above
        economic_discussion_administrator_request_decisions: {
          none: {
            economic_discussion_administrator_request_id: {
              contains: "",
            },
          },
        },
      },
    });
  // Transform to IPageIEconomicDiscussionAdministratorRequest
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: requests.map((request) => ({
      requester_id: request.economic_discussion_citizen_id,
      reason: request.reason,
      status: "pending",
      submitted_at: toISOStringSafe(request.created_at),
      decision: undefined,
    })),
  };
}
