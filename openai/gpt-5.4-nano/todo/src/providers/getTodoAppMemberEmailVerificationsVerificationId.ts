import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberEmailVerificationTransformer } from "../transformers/TodoAppMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.todo_app_member_email_verifications.findFirstOrThrow({
      where: {
        id: props.verificationId,
        todo_app_member_id: props.member.id,
        deleted_at: null,
      },
      ...TodoAppMemberEmailVerificationTransformer.select(),
    });
  return TodoAppMemberEmailVerificationTransformer.transform(record);
}
