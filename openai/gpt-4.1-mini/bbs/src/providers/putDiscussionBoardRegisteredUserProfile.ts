import { IDiscussionBoardRegisteredUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardRegisteredUserProfileTransformer } from "../transformers/DiscussionBoardRegisteredUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardRegisteredUserProfile(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserProfile.IUpdate;
}): Promise<IDiscussionBoardRegisteredUserProfile> {
  await MyGlobal.prisma.discussion_board_registered_users.findUniqueOrThrow({
    where: { id: props.registeredUser.id },
    select: { id: true },
  });
  const data: {
    display_name?: {
      set: string | undefined;
    };
    bio?: {
      set: string | undefined;
    };
  } = {};
  if ("displayName" in props.body) {
    data.display_name = { set: props.body.displayName ?? undefined };
  }
  if ("bio" in props.body) {
    data.bio = { set: props.body.bio ?? undefined };
  }
  await MyGlobal.prisma.discussion_board_registered_users.update({
    where: { id: props.registeredUser.id },
    data,
  });
  const updated =
    await MyGlobal.prisma.discussion_board_registered_users.findUniqueOrThrow({
      where: { id: props.registeredUser.id },
      ...DiscussionBoardRegisteredUserProfileTransformer.select(),
    });
  return await DiscussionBoardRegisteredUserProfileTransformer.transform(
    updated,
  );
}
