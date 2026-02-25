import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { MultiUserTodoUserTransformer } from "../transformers/MultiUserTodoUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoUserProfile(props: {
  user: UserPayload;
  body: IMultiUserTodoUser.IUpdate;
}): Promise<IMultiUserTodoUser> {
  // Load current user record including deleted_at for soft delete check
  const user = await MyGlobal.prisma.multi_user_todo_users.findUnique({
    where: { id: props.user.id },
    select: {
      id: true,
      display_name: true,
      deleted_at: true,
    },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Prepare updated fields
  const nowPlusString = toISOStringSafe(new Date());
  const updateData: {
    display_name?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: nowPlusString,
  };
  if (typeof props.body.displayName === "string") {
    updateData.display_name = props.body.displayName;
  }
  // Update user
  await MyGlobal.prisma.multi_user_todo_users.update({
    where: { id: props.user.id },
    data: updateData,
  });
  // Retrieve updated user with transformer select
  const updatedUser =
    await MyGlobal.prisma.multi_user_todo_users.findUniqueOrThrow({
      where: { id: props.user.id },
      ...MultiUserTodoUserTransformer.select(),
    });
  return await MultiUserTodoUserTransformer.transform(updatedUser);
}
