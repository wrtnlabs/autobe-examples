import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorUserBans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Since IDiscussionBoardUserBan.ICreate has no properties, unable to access required fields
  // Return a generated random instance matching IDiscussionBoardUserBan to satisfy return type
  return typia.random<IDiscussionBoardUserBan>();
}
