import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserCommunities(props: {
  user: UserPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  const now = toISOStringSafe(new Date());

  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_community_communities.create({
    data: {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  };
}
