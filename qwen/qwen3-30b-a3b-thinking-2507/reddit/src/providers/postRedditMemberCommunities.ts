import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCollector } from "../collectors/RedditCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityTransformer } from "../transformers/RedditCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCommunity.ICreate;
}): Promise<IRedditCommunity> {
  const collected = await RedditCommunityCollector.collect({
    body: props.body,
    redditMembers: {
      id: props.member.id,
    },
  });
  const created = await MyGlobal.prisma.reddit_communities.create({
    data: collected,
  });
  return await RedditCommunityTransformer.transform(created);
}
