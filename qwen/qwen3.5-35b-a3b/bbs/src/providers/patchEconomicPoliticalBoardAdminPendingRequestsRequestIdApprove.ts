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

export async function patchEconomicPoliticalBoardAdminPendingRequestsRequestIdApprove(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRequest> {
  const existingAdmin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: props.admin.id },
        select: { grade: true },
      },
    );
  if (existingAdmin === null || existingAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const request =
    await MyGlobal.prisma.economic_political_board_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is not pending", 400);
  }
  const user =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: request.user_id },
      },
    );
  if (user !== null) {
    throw new HttpException("User is already an administrator", 400);
  }
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.economic_political_board_administrator_roles.create({
      data: {
        id: v4(),
        user_id: request.user_id,
        grade: "regular",
        promoted_by_user_id: props.admin.id,
        promoted_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    return await tx.economic_political_board_administrator_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        reviewed_by_admin_id: props.admin.id,
        reviewed_at: now,
        updated_at: now,
      },
      include: {
        user: true,
        reviewedByAdmin: {
          include: {
            user: true,
            promotedByUser: true,
          },
        },
      },
    });
  });
  return await EconomicPoliticalBoardAdministratorRequestTransformer.transform(
    updated,
  );
}
