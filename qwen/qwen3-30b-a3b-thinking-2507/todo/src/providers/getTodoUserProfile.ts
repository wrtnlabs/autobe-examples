import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoProfileTransformer } from "../transformers/TodoProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoUserProfile(props: {
  user: UserPayload;
}): Promise<ITodoProfile> {
  const profile = await MyGlobal.prisma.todo_profiles.findUnique({
    where: { id: props.user.id },
    ...TodoProfileTransformer.select(),
  });
  if (!profile) throw new HttpException("Profile not found", 404);
  return await TodoProfileTransformer.transform(profile);
}
