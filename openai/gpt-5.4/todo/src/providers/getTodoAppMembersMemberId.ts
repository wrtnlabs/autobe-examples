import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember> {
  const getAuthorizedMemberId = (): (string & tags.Format<"uuid">) | null => {
    const candidate: unknown = Reflect.get(globalThis, "__nestia");
    if (typeof candidate !== "object" || candidate === null) {
      return null;
    }
    const member: unknown = Reflect.get(candidate, "member");
    if (typeof member !== "object" || member === null) {
      return null;
    }
    const id: unknown = Reflect.get(member, "id");
    if (typeof id !== "string") {
      return null;
    }
    return typia.assert<string & tags.Format<"uuid">>(id);
  };
  const authorizedMemberId = getAuthorizedMemberId();
  if (authorizedMemberId === null) {
    throw new HttpException("Unauthorized", 401);
  }
  if (authorizedMemberId !== props.memberId) {
    throw new HttpException("Forbidden", 403);
  }
  const member = await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(member);
}
