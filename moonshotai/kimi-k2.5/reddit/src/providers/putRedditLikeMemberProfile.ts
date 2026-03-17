import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeMemberTransformer } from "../transformers/RedditLikeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberProfile(props: {
  member: AdminPayload;
  body: IRedditLikeMember.IUpdate;
}): Promise<IRedditLikeMember> {
  const updated = await MyGlobal.prisma.reddit_like_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.username !== undefined && {
        username: props.body.username,
      }),
      updated_at: new Date(),
    },
    ...RedditLikeMemberTransformer.select(),
  });
  return await RedditLikeMemberTransformer.transform(updated);
}
