import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserEmailVerificationTransformer } from "../transformers/MultiUserTodoUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUserEmailVerificationsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUserEmailVerification> {
  const record =
    await MyGlobal.prisma.multi_user_todo_user_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...MultiUserTodoUserEmailVerificationTransformer.select(),
      },
    );
  if (record.multi_user_todo_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await MultiUserTodoUserEmailVerificationTransformer.transform(record);
}
