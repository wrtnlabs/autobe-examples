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

export async function getEconDiscussMemberMeReputation(props: {
  member: MemberPayload;
}): Promise<IEconDiscussUserReputation> {
  const { member } = props;

  const found = await MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });

  if (!found) {
    const now = toISOStringSafe(new Date());
    return {
      id: v4() as string & tags.Format<"uuid">,
      userId: member.id,
      score: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: found.id as string & tags.Format<"uuid">,
    userId: found.user_id as string & tags.Format<"uuid">,
    score: found.score as number & tags.Type<"int32"> & tags.Minimum<0>,
    lastUpdatedAt: toISOStringSafe(found.last_updated_at),
    createdAt: toISOStringSafe(found.created_at),
    updatedAt: toISOStringSafe(found.updated_at),
  };
}
