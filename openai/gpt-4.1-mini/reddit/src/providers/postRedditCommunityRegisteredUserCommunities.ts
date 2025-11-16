import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postRedditCommunityRegisteredUserCommunities(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  const now = new Date();
  const nowISOString = toISOStringSafe(now);

  const created = await MyGlobal.prisma.reddit_community_communities.create({
    data: {
      id: v4(),
      name: props.body.communityName,
      description: props.body.description,
      status: props.body.status,
      created_at: nowISOString,
      updated_at: nowISOString,
      deleted_at: null,
      creator_id: props.registeredUser.id,
    },
  });

  return {
    id: created.id,
    communityName: created.name satisfies string as string,
    description: created.description ?? "",
    status: typia.assert<"active" | "inactive">(created.status),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
    creator_id: created.creator_id,
  };
}
