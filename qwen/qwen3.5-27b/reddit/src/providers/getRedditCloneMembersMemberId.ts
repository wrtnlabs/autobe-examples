import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberTransformer } from "../transformers/RedditCloneMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneMember> {
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    ...RedditCloneMemberTransformer.select(),
  });
  return await RedditCloneMemberTransformer.transform(member);
}
