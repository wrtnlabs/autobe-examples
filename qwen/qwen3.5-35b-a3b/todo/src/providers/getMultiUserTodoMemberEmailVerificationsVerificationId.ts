import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoMemberEmailVerificationTransformer } from "../transformers/MultiUserTodoMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberEmailVerificationsVerificationId(props: {
  verificationId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberEmailVerification> {
  const record =
    await MyGlobal.prisma.multi_user_todo_member_email_verifications.findUniqueOrThrow(
      {
        ...MultiUserTodoMemberEmailVerificationTransformer.select(),
        where: {
          id: props.verificationId,
        },
      },
    );
  return await MultiUserTodoMemberEmailVerificationTransformer.transform(
    record,
  );
}
