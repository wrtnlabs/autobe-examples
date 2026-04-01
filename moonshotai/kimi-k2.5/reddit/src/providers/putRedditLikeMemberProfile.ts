import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeMemberTransformer } from "../transformers/RedditLikeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberProfile(props: {
  member: MemberPayload;
  body: IRedditLikeMember.IUpdate;
}): Promise<IRedditLikeMember> {
  // Update the member record
  await MyGlobal.prisma.reddit_like_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.username !== undefined && {
        username: props.body.username,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch the updated record with full selection
  const updated = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...RedditLikeMemberTransformer.select(),
  });
  // Transform and return
  return await RedditLikeMemberTransformer.transform(updated);
}
