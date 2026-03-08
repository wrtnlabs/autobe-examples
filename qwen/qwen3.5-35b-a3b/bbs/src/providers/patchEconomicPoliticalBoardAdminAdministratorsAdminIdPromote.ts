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
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminAdministratorsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRole.ISummary> {
  // Verify current admin has super grade
  const currentAdmin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirstOrThrow(
      {
        where: {
          user_id: props.admin.id,
        },
      },
    );
  if (currentAdmin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Check target administrator exists and has regular grade
  const targetAdmin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirstOrThrow(
      {
        where: {
          id: props.adminId,
        },
      },
    );
  if (targetAdmin.grade !== "regular") {
    throw new HttpException(
      "Target administrator is not a regular administrator",
      400,
    );
  }
  // Prevent self-promotion
  if (targetAdmin.user_id === props.admin.id) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // Update the target administrator to super grade
  const updatedAdmin =
    await MyGlobal.prisma.economic_political_board_administrator_roles.update({
      where: {
        id: props.adminId,
      },
      data: {
        grade: "super",
        promoted_by_user_id: props.admin.id,
        promoted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      ...EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
    });
  return await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
    updatedAdmin,
  );
}
