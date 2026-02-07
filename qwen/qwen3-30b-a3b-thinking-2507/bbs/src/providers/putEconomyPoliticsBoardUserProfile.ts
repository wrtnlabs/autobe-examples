import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardUserTransformer } from "../transformers/EconomyPoliticsBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardUserProfile(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardUser.IUpdate;
}): Promise<IEconomyPoliticsBoardUser> {
  const user = await MyGlobal.prisma.economy_politics_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const isPasswordValid = await PasswordUtil.verify(
    props.body.currentPassword,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Current password is incorrect", 403);
  }
  if (props.body.newPassword.length < 8) {
    throw new HttpException("New password must be at least 8 characters", 400);
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  const updatedUser = await MyGlobal.prisma.economy_politics_board_users.update(
    {
      where: { id: props.user.id },
      data: {
        password_hash: newPasswordHash,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return await EconomyPoliticsBoardUserTransformer.transform(updatedUser);
}
