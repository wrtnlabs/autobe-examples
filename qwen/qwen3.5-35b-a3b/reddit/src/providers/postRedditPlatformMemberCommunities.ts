import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityCollector } from "../collectors/RedditPlatformCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunity.ICreate;
}): Promise<IRedditPlatformCommunity> {
  // Check community name uniqueness
  const existing = await MyGlobal.prisma.reddit_platform_communities.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Community name already exists", 409);
  }
  // Create the community
  const created = await MyGlobal.prisma.reddit_platform_communities.create({
    data: await RedditPlatformCommunityCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id },
    }),
    ...RedditPlatformCommunityTransformer.select(),
  });
  // Transform and return
  return await RedditPlatformCommunityTransformer.transform(created);
}
