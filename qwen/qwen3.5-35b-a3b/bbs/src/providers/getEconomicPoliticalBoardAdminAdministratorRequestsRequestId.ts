import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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

export async function getEconomicPoliticalBoardAdminAdministratorRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRequest> {
  // Verify super administrator privilege
  const adminRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          user_id: props.admin.id,
          grade: "super" as const,
        },
      },
    );
  if (adminRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the administrator request with transformer select
  const request =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EconomicPoliticalBoardAdministratorRequestTransformer.select(),
      },
    );
  // Transform and return
  return await EconomicPoliticalBoardAdministratorRequestTransformer.transform(
    request,
  );
}
