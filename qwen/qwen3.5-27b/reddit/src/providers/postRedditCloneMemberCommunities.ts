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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCloneCommunity.ICreate;
}): Promise<IRedditCloneCommunity> {
  // Check name uniqueness against active communities
  const existing = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Community name already exists", 409);
  }
  // Create community with subscriber_count initialized to 1
  const created = await MyGlobal.prisma.reddit_clone_communities.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      icon: props.body.icon ?? null,
      subscriber_count: 1,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      owner: { connect: { id: props.member.id } },
    } satisfies Prisma.reddit_clone_communitiesCreateInput,
    ...RedditCloneCommunityTransformer.select(),
  });
  // Create moderator assignment with 'owner' role
  await MyGlobal.prisma.reddit_clone_community_moderators.create({
    data: {
      id: v4(),
      reddit_clone_communities_id: created.id,
      reddit_clone_members_id: props.member.id,
      role: "owner",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  return await RedditCloneCommunityTransformer.transform(created);
}
