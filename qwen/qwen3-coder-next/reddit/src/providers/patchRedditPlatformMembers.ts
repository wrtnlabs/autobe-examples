import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberTransformer } from "../transformers/RedditPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMembers(props: {
  body: IRedditPlatformMember.IUpdate;
}): Promise<IRedditPlatformMember> {
  const now = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.reddit_platform_members.update({
    where: { id: "1" },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      updated_at: now,
    },
    ...RedditPlatformMemberTransformer.select(),
  });
  return await RedditPlatformMemberTransformer.transform(member);
}
