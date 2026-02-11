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
  const created = await MyGlobal.prisma.reddit_platform_communities.create({
    data: await RedditPlatformCommunityCollector.collect({
      body: props.body,
      redditPlatformMembers: {
        id: props.member.id as string & tags.Format<"uuid">,
      },
      redditPlatformMemberSessions: {
        id: props.member.session_id as string & tags.Format<"uuid">,
      },
    }),
    ...RedditPlatformCommunityTransformer.select(),
  });
  return await RedditPlatformCommunityTransformer.transform(created);
}
