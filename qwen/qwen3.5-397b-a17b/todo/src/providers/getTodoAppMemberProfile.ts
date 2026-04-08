import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberAtSummaryTransformer } from "../transformers/TodoAppMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberProfile(props: {
  member: MemberPayload;
}): Promise<ITodoAppMember.ISummary> {
  const record = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    ...TodoAppMemberAtSummaryTransformer.select(),
  });
  return await TodoAppMemberAtSummaryTransformer.transform(record);
}
