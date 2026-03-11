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

export async function getEconomicPoliticalBoardAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardAdministratorRole> {
  const role =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUniqueOrThrow(
      {
        where: { id: props.roleId },
        ...EconomicPoliticalBoardAdministratorRoleTransformer.select(),
      },
    );
  return await EconomicPoliticalBoardAdministratorRoleTransformer.transform(
    role,
  );
}
