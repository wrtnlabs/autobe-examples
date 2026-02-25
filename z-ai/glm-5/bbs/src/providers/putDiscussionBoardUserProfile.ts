import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserTransformer } from "../transformers/DiscussionBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserProfile(props: {
  user: UserPayload;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.user.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      updated_at: new Date(),
    },
    ...DiscussionBoardUserTransformer.select(),
  });
  return await DiscussionBoardUserTransformer.transform(updated);
}
