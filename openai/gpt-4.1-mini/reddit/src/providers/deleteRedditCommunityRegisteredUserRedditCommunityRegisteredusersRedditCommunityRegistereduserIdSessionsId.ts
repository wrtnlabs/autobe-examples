import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityRegisteredusersRedditCommunityRegistereduserIdSessionsId(props: {
  registeredUser: RegistereduserPayload;
  redditCommunityRegistereduserId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.findUnique({
      where: {
        id: props.id,
      },
    });

  if (
    session === null ||
    session.reddit_community_registereduser_id !==
      props.redditCommunityRegistereduserId
  ) {
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.reddit_community_registereduser_sessions.delete({
    where: {
      id: props.id,
    },
  });
}
