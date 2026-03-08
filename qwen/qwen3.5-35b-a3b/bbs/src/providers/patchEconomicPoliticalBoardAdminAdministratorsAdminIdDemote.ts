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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminAdministratorsAdminIdDemote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRole.IUpdate> {
  // 1. Verify requester has super administrator grade
  const requester =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          user_id: props.admin.id,
        },
      },
    );
  if (requester === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (requester.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify target admin exists and has super grade
  const target =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          id: props.adminId,
        },
      },
    );
  if (target === null || target.grade !== "super") {
    throw new HttpException("Not Found", 404);
  }
  // 3. Prevent self-demote
  if (props.admin.id === target.user_id) {
    throw new HttpException("Conflict", 409);
  }
  // 4. Update grade to regular
  await MyGlobal.prisma.economic_political_board_administrator_roles.update({
    where: {
      id: props.adminId,
    },
    data: {
      grade: "regular",
      updated_at: new Date(),
    },
  });
  // 5. Return IUpdate DTO
  return {
    grade: "regular",
  };
}
