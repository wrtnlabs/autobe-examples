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

export async function getDiscussionBoardUserProfile(props: {
  user: UserPayload;
}): Promise<IDiscussionBoardUser> {
  const userRecord = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
    ...DiscussionBoardUserTransformer.select(),
  });
  if (!userRecord) {
    throw new HttpException("User profile not found", 404);
  }
  return await DiscussionBoardUserTransformer.transform(userRecord);
}
