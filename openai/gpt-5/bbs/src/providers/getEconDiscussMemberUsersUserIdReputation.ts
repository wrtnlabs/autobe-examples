import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserReputation";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberUsersUserIdReputation(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussUserReputation> {
  const { member, userId } = props;

  const targetUser = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!targetUser) {
    throw new HttpException("Not Found", 404);
  }

  const rep = await MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
    where: {
      user_id: userId,
      deleted_at: null,
    },
  });
  if (!rep) {
    throw new HttpException("Not Found", 404);
  }

  const dto = {
    id: rep.id,
    userId: rep.user_id,
    score: rep.score,
    lastUpdatedAt: toISOStringSafe(rep.last_updated_at),
    createdAt: toISOStringSafe(rep.created_at),
    updatedAt: toISOStringSafe(rep.updated_at),
  };

  return typia.assert<IEconDiscussUserReputation>(dto);
}
