import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardAdminTransformer } from "../transformers/EconomyPoliticsBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardAdminsAdminId(props: {
  adminId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardAdmin> {
  const admin = await MyGlobal.prisma.economy_politics_board_admins.findUnique({
    where: { id: props.adminId, deleted_at: null },
    ...EconomyPoliticsBoardAdminTransformer.select(),
  });
  if (!admin) throw new HttpException("Admin not found", 404);
  return await EconomyPoliticsBoardAdminTransformer.transform(admin);
}
