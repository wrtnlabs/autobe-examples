import { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardSuperAdminTransformer } from "../transformers/EconomyPoliticsBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardSuperadminsSuperAdminId(props: {
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardSuperAdmin> {
  const record =
    await MyGlobal.prisma.economy_politics_board_super_admins.findUnique({
      where: { id: props.superAdminId },
      ...EconomyPoliticsBoardSuperAdminTransformer.select(),
    });
  if (!record) {
    throw new HttpException("Super admin not found", 404);
  }
  return await EconomyPoliticsBoardSuperAdminTransformer.transform(record);
}
