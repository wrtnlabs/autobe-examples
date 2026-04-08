import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeMemberTransformer } from "../transformers/RedditLikeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeMember> {
  const record = await MyGlobal.prisma.reddit_like_members.findFirstOrThrow({
    ...RedditLikeMemberTransformer.select(),
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  return await RedditLikeMemberTransformer.transform(record);
}
