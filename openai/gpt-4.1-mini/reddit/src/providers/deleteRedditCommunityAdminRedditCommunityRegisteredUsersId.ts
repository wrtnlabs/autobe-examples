import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityRegisteredusersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const user =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: props.id },
    });

  if (user === null) {
    throw new HttpException("Registered user not found", 404);
  }

  await MyGlobal.prisma.reddit_community_registeredusers.delete({
    where: { id: props.id },
  });
}
