import { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdminRequest";
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

export async function patchEconomicBoardSuperAdministratorAdminRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicBoardAdminRequest.IRequest;
}): Promise<IPageIEconomicBoardAdminRequest.ISummary> {
  const page = 1; // Hardcoded default from spec
  const limit = 25; // Hardcoded default from spec
  const skip = (page - 1) * limit;
  // Extract status from request body even though IRequest is empty
  // This is allowed by the HTTP framework; body can have additional fields
  const status = (props.body as any).status;
  // Build where clause with proper type safety and constraints
  const where: Prisma.economic_board_admin_requestsWhereInput = {
    status: status ? status : undefined,
  } satisfies Prisma.economic_board_admin_requestsWhereInput;
  // Fetch records with relation via select (NOT include)
  const data = await MyGlobal.prisma.economic_board_admin_requests.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    where,
    select: {
      id: true,
      status: true,
      created_at: true,
      requester: { select: { display_name: true } },
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.economic_board_admin_requests.count({
    where,
  });
  // Transform to ISummary with proper date format and branded types
  const summaries: IEconomicBoardAdminRequest.ISummary[] = data.map((item) => ({
    id: item.id,
    requester_display_name: item.requester.display_name,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
  }));
  return {
    data: summaries,
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
