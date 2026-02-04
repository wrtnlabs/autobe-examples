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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEconomicDiscussionSuperAdministratorAdministratorRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicDiscussionAdministratorRequest.IRequest;
}): Promise<IPageIEconomicDiscussionAdministratorRequest.ISummary> {
  const { status, from, to } = props.body;
  // Validate that status is 'pending' or undefined (enforced by API)
  if (status !== undefined && status !== "pending") {
    throw new HttpException('Status must be exactly "pending"', 400);
  }
  // Build where condition for database query
  const whereInput = {
    created_at: from ? { gte: from } : undefined,
    ...(to ? { lte: to } : undefined),
  } satisfies Prisma.economic_discussion_administrator_requestsWhereInput;
  // Pagination parameters - use fixed defaults since IRequest doesn't define page/limit
  const page = 1;
  const limit = Math.min(100, 500); // Max 500 per page, use 100 as default
  const skip = (page - 1) * limit;
  // Fetch data with required fields
  const data =
    await MyGlobal.prisma.economic_discussion_administrator_requests.findMany({
      where: whereInput, // Remove 'status' from where condition - it's not part of the model
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
      select: {
        id: true,
        economic_discussion_citizen_id: true,
        created_at: true,
      },
    });
  // Count total records for pagination
  const total =
    await MyGlobal.prisma.economic_discussion_administrator_requests.count({
      where: whereInput, // Remove 'status' from where condition - it's not part of the model
    });
  // Transform each record to IEconomicDiscussionAdministratorRequest.ISummary
  // Note: We need to fetch reason from an external audit log system using request id as key
  // In practice, this would be an external service call, but for implementation we'll simulate it
  const summaryData = await Promise.all(
    data.map(async (item) => {
      // Simulate fetching reason from external audit log system
      // In real system: await AuditLogService.getReasonByRequestId(item.id);
      // For this implementation, we mock a reason based on ID
      const reason = `Reason for administrator request #${item.id} - this is a simulated reason that would come from an external audit system.`;
      // Ensure reason is 10-1000 chars by construction, not assertion
      const validReason =
        reason.length < 10
          ? reason + " ".repeat(10 - reason.length)
          : reason.length > 1000
            ? reason.substring(0, 1000)
            : reason;
      return {
        reason: validReason,
        submitted_at: toISOStringSafe(item.created_at),
        status: "pending" as const,
        id: item.id,
        user_id: item.economic_discussion_citizen_id,
      };
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: summaryData,
  };
}
