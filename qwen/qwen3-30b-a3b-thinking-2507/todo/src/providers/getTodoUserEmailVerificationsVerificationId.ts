import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoUserEmailVerificationTransformer } from "../transformers/TodoUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoUserEmailVerificationsVerificationId(props: {
  user: UserPayload;
  verificationId: string;
}): Promise<ITodoUserEmailVerification> {
  const verification =
    await MyGlobal.prisma.todo_user_email_verifications.findUnique({
      where: { id: props.verificationId, deleted_at: null },
      include: { user: true },
    });
  if (!verification) {
    throw new HttpException("Verification not found", 404);
  }
  const currentIso = toISOStringSafe(new Date());
  const expiresAtIso = toISOStringSafe(verification.expires_at);
  if (currentIso > expiresAtIso) {
    throw new HttpException("Verification token has expired", 404);
  }
  if (verification.todo_user_id !== props.user.id) {
    throw new HttpException("Unauthorized", 403);
  }
  return await TodoUserEmailVerificationTransformer.transform(verification);
}
