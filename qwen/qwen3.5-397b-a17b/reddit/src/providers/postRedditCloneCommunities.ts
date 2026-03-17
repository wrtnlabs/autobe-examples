import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneCommunities(props: {
  body: IRedditCloneCommunity.ICreate;
}): Promise<IRedditCloneCommunity> {
  const existing = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Community name already exists", 409);
  }
  const created = await MyGlobal.prisma.reddit_clone_communities.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      icon: props.body.icon ?? null,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: "" } },
    },
    ...RedditCloneCommunityTransformer.select(),
  });
  return await RedditCloneCommunityTransformer.transform(created);
}
