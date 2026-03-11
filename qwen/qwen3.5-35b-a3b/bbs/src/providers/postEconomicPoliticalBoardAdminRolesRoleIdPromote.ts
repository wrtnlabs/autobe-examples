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
import { EconomicPoliticalBoardAdministratorRoleTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAdminRolesRoleIdPromote(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRole> {
  const targetRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: props.roleId },
        select: {
          id: true,
          grade: true,
          user_id: true,
        },
      },
    );
  const requesterRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: { user_id: props.admin.id },
        select: { grade: true },
      },
    );
  if (requesterRole === null || requesterRole.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  if (targetRole.grade === "super") {
    throw new HttpException("Target is already super administrator", 400);
  }
  if (targetRole.user_id === props.admin.id) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  await MyGlobal.prisma.economic_political_board_administrator_roles.update({
    where: { id: props.roleId },
    data: {
      grade: "super",
      promoted_at: new Date(),
      promoted_by_user_id: props.admin.id,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: props.roleId },
        ...EconomicPoliticalBoardAdministratorRoleTransformer.select(),
      },
    );
  return await EconomicPoliticalBoardAdministratorRoleTransformer.transform(
    updated,
  );
}
