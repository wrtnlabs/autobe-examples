import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityRegisteredusersId(props: {
  registeredUser: RegistereduserPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUser.IUpdate;
}): Promise<IRedditCommunityRegisteredUser> {
  const existing =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("User not found", 404);
  }

  const emailInUse =
    await MyGlobal.prisma.reddit_community_registeredusers.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.id },
      },
    });

  if (emailInUse) {
    throw new HttpException("Email is already in use", 409);
  }

  const updated = await MyGlobal.prisma.reddit_community_registeredusers.update(
    {
      where: { id: props.id },
      data: {
        email: props.body.email,
        deleted_at: props.body.deleted_at ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
