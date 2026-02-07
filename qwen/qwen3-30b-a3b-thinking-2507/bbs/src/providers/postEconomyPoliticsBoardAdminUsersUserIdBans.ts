import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardUserBanCollector } from "../collectors/EconomyPoliticsBoardUserBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomyPoliticsBoardUserBanTransformer } from "../transformers/EconomyPoliticsBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardAdminUsersUserIdBans(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardUserBan.ICreate;
}): Promise<IEconomyPoliticsBoardUserBan> {
  const user = await MyGlobal.prisma.economy_politics_board_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) throw new HttpException("User not found", 404);
  const admin = await MyGlobal.prisma.economy_politics_board_admins.findUnique({
    where: { id: props.admin.id, deleted_at: null },
  });
  if (!admin) throw new HttpException("Admin not found", 404);
  const data = await EconomyPoliticsBoardUserBanCollector.collect({
    body: props.body,
    economyPoliticsBoardUsers: user,
    economyPoliticsBoardAdmins: admin,
  });
  const created = await MyGlobal.prisma.economy_politics_board_user_bans.create(
    {
      data,
      ...EconomyPoliticsBoardUserBanTransformer.select(),
    },
  );
  return await EconomyPoliticsBoardUserBanTransformer.transform(created);
}
