import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumUserTransformer } from "../transformers/EconomicForumUserTransformer";

export async function getEconomicForumUserUsersUserId(props: {
  user: UserPayload;
  userId: string;
}): Promise<IEconomicForumUser> {
  const user = await MyGlobal.prisma.economic_forum_users.findUnique({
    where: { id: props.userId },
    ...EconomicForumUserTransformer.select(),
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return await EconomicForumUserTransformer.transform(user);
}
