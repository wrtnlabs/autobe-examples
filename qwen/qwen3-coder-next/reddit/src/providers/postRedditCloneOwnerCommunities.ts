import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityCollector } from "../collectors/RedditCloneCommunityCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneOwnerCommunities(props: {
  owner: OwnerPayload;
  body: IRedditCloneCommunity.ICreate;
}): Promise<IRedditCloneCommunity> {
  const created = await MyGlobal.prisma.reddit_clone_communities.create({
    data: {
      ...(await RedditCloneCommunityCollector.collect({
        body: props.body,
        redditCloneOwners: { id: props.owner.id },
        redditCloneOwnerSessions: { id: props.owner.session_id },
      })),
      subscriber_count: 1,
    },
    ...RedditCloneCommunityTransformer.select(),
  });
  await MyGlobal.prisma.reddit_clone_moderator_assignments.create({
    data: {
      id: v4(),
      appointed_actor_id: props.owner.id,
      appointing_actor_id: props.owner.id,
      role: "owner",
      community_id: created.id,
      assigned_at: toISOStringSafe(new Date()),
      status: "active",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.reddit_clone_content_subscriptions.create({
    data: {
      id: v4(),
      member_id: props.owner.id,
      community_id: created.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return await RedditCloneCommunityTransformer.transform(created);
}
