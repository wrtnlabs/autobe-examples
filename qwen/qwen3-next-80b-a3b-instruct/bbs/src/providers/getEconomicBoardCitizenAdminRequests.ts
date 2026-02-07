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
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardCitizenAdminRequests(props: {
  citizen: CitizenPayload;
}): Promise<IPageIEconomicBoardAdminRequest> {
  const page = 1;
  const limit = 25;
  const skip = (page - 1) * limit;
  const whereInput = {
    requester_id: props.citizen.id,
    status: "pending",
  } satisfies Prisma.economic_board_admin_requestsWhereInput;
  const data = await MyGlobal.prisma.economic_board_admin_requests.findMany({
    where: whereInput,
    select: {
      id: true,
      requester_id: true,
      status: true,
      reason_text: true,
      created_at: true,
      processed_at: true,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.economic_board_admin_requests.count({
    where: {
      requester_id: props.citizen.id,
      status: "pending",
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      requester_id: item.requester_id as string & tags.Format<"uuid">,
      status: item.status,
      reason_text: item.reason_text,
      created_at: toISOStringSafe(item.created_at),
      processed_at: item.processed_at
        ? toISOStringSafe(item.processed_at)
        : null,
    })) as IEconomicBoardAdminRequest[],
  };
}
