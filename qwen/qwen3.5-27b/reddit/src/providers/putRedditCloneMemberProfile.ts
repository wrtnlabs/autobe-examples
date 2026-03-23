import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberTransformer } from "../transformers/RedditCloneMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCloneMember.IUpdate;
}): Promise<IRedditCloneMember> {
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  const updated = await MyGlobal.prisma.reddit_clone_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar_uri !== undefined && {
        avatar_uri: props.body.avatar_uri,
      }),
      updated_at: new Date(),
    },
    ...RedditCloneMemberTransformer.select(),
  });
  return await RedditCloneMemberTransformer.transform(updated);
}
