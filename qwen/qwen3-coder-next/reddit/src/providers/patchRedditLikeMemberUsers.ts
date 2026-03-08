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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberUsers(props: {
  member: MemberPayload;
  body: IRedditLikeMember.IUpdate;
}): Promise<IRedditLikeMember> {
  await MyGlobal.prisma.reddit_like_members.update({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && {
        bio: props.body.bio,
      }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  return typia.random<IRedditLikeMember>();
}
