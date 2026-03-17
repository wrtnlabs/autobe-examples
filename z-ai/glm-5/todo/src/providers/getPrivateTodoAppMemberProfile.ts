import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppMemberTransformer } from "../transformers/PrivateTodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getPrivateTodoAppMemberProfile(props: {
  member: MemberPayload;
}): Promise<IPrivateTodoAppMember> {
  const member =
    await MyGlobal.prisma.private_todo_app_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...PrivateTodoAppMemberTransformer.select(),
    });
  return await PrivateTodoAppMemberTransformer.transform(member);
}
