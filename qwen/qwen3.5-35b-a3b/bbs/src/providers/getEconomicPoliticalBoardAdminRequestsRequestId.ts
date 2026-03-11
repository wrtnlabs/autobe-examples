import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAdministratorRequestTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardAdminRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRequest> {
  // Verify caller is super administrator
  const requestingAdmin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirstOrThrow(
      {
        where: {
          user_id: props.admin.id,
        },
        select: { grade: true },
      },
    );
  if (requestingAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the administrator request with full relations
  const request =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EconomicPoliticalBoardAdministratorRequestTransformer.select(),
      },
    );
  // Transform to response DTO
  return await EconomicPoliticalBoardAdministratorRequestTransformer.transform(
    request,
  );
}
