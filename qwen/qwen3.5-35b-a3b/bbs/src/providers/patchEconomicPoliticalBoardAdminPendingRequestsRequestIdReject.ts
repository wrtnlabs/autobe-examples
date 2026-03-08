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

export async function patchEconomicPoliticalBoardAdminPendingRequestsRequestIdReject(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAdministratorRequest.IRejection;
}): Promise<IEconomicPoliticalBoardAdministratorRequest> {
  const admin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          user_id: props.admin.id,
        },
      },
    );
  if (admin === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (admin.grade !== "super") {
    throw new HttpException("You're not super administrator", 403);
  }
  const request =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is not pending", 409);
  }
  const now = new Date();
  const updated =
    await MyGlobal.prisma.economic_political_board_administrator_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: "rejected",
          reviewed_by_admin_id: props.admin.id,
          reviewed_at: now,
          review_notes: props.body.review_notes ?? null,
          updated_at: now,
        },
        ...EconomicPoliticalBoardAdministratorRequestTransformer.select(),
      },
    );
  return await EconomicPoliticalBoardAdministratorRequestTransformer.transform(
    updated,
  );
}
