import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityCollector } from "../collectors/RedditCommunityCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  const created = await MyGlobal.prisma.reddit_community_communities.create({
    data: await RedditCommunityCommunityCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
      redditCommunityMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCommunityCommunityTransformer.select(),
  });
  return await RedditCommunityCommunityTransformer.transform(created);
}
