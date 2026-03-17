import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeOwnerTransformer } from "../transformers/RedditLikeOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnersOwnerId(props: {
  ownerId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeOwner> {
  const owner = await MyGlobal.prisma.reddit_like_owners.findUniqueOrThrow({
    where: { id: props.ownerId },
    ...RedditLikeOwnerTransformer.select(),
  });
  return await RedditLikeOwnerTransformer.transform(owner);
}
