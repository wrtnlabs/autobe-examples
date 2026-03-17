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

export async function putPrivateTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: IPrivateTodoAppMember.IUpdate;
}): Promise<IPrivateTodoAppMember> {
  const updated = await MyGlobal.prisma.private_todo_app_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      updated_at: new Date(),
    },
    ...PrivateTodoAppMemberTransformer.select(),
  });
  return await PrivateTodoAppMemberTransformer.transform(updated);
}
