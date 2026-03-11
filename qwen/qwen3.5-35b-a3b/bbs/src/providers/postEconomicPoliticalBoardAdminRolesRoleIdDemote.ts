import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardAdministratorRoleDemoteRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRoleDemoteRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardAdministratorRoleTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAdminRolesRoleIdDemote(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardAdministratorRoleDemoteRequest;
}): Promise<IEconomicPoliticalBoardAdministratorRole> {
  const requestingUserId: string & tags.Format<"uuid"> = props.admin.id;
  const requestedRaw =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: requestingUserId },
      },
    );
  if (requestedRaw === null) {
    throw new HttpException("You are not enrolled", 403);
  }
  const requested: any = {
    ...requestedRaw,
    created_at: requestedRaw.created_at,
    updated_at: requestedRaw.updated_at,
    promoted_at: requestedRaw.promoted_at,
    grade: requestedRaw.grade,
  };
  const requestedGrade: "regular" | "super" = requested.grade;
  if (requestedGrade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const targetRaw =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: props.roleId },
      },
    );
  const target: any = {
    ...targetRaw,
    created_at: targetRaw.created_at,
    updated_at: targetRaw.updated_at,
    promoted_at: targetRaw.promoted_at,
    grade: targetRaw.grade,
  };
  const targetUserId: string & tags.Format<"uuid"> = target.user_id;
  if (targetUserId === requestingUserId) {
    throw new HttpException("Cannot demote yourself", 403);
  }
  const targetGrade: "regular" | "super" = target.grade;
  if (targetGrade !== "super") {
    throw new HttpException("Target is not a super administrator", 400);
  }
  const updatedRaw =
    await MyGlobal.prisma.economic_political_board_administrator_roles.update({
      where: { id: props.roleId },
      data: {
        grade: "regular",
        updated_at: new Date(),
        promoted_by_user_id: requestingUserId,
      },
      ...EconomicPoliticalBoardAdministratorRoleTransformer.select(),
    });
  const updated: any = {
    ...updatedRaw,
    created_at: updatedRaw.created_at,
    updated_at: updatedRaw.updated_at,
    promoted_at: updatedRaw.promoted_at,
    grade: updatedRaw.grade,
  };
  return await EconomicPoliticalBoardAdministratorRoleTransformer.transform(
    updated,
  );
}
