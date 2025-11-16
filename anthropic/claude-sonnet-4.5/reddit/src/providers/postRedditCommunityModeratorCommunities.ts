import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditCommunityModeratorCommunities(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  const now = new Date();
  const communityId = v4();

  const created = await MyGlobal.prisma.reddit_community_communities.create({
    data: {
      id: communityId,
      creator_member_id: props.moderator.id,
      name: props.body.name,
      display_title: props.body.display_title,
      description: props.body.description,
      icon_url: props.body.icon_url ?? null,
      banner_url: props.body.banner_url ?? null,
      subscriber_count: 0,
      post_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    creator_member_id: created.creator_member_id,
    name: created.name,
    display_title: created.display_title,
    description: created.description,
    rules: props.body.rules,
    icon_url: created.icon_url ?? undefined,
    banner_url: created.banner_url ?? undefined,
    subscriber_count: created.subscriber_count,
    post_count: created.post_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
