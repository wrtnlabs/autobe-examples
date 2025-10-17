import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";

export async function getEconDiscussTopicsTopicId(props: {
  topicId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussTopic> {
  const row = await MyGlobal.prisma.econ_discuss_topics.findFirst({
    where: {
      id: props.topicId,
      deleted_at: null,
    },
  });
  if (!row) throw new HttpException("Not Found", 404);

  return {
    id: props.topicId,
    code: row.code,
    name: row.name,
    description: row.description === null ? undefined : row.description,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  };
}
