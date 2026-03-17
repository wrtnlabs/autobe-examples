import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
  // Validate icon_file_id if provided
  if (
    props.body.icon_file_id !== undefined &&
    props.body.icon_file_id !== null
  ) {
    await MyGlobal.prisma.reddit_platform_files.findUniqueOrThrow({
      where: {
        id: props.body.icon_file_id,
      },
    });
  }
  // Create community using collector
  const created = await MyGlobal.prisma.reddit_platform_communities.create({
    data: {
      ...(await RedditPlatformCommunityCollector.collect({
        body: props.body,
        redditPlatformMembers: {
          id: props.member.id,
        } satisfies {
          id: string & tags.Format<"uuid">;
        },
      })),
      subscriber_count: 1, // Owner auto-subscription
    },
    ...RedditPlatformCommunityTransformer.select(),
  } satisfies Prisma.reddit_platform_communitiesCreateArgs);
  // Create subscription record for owner auto-subscription
  await MyGlobal.prisma.reddit_platform_community_subscriptions.create({
    data: {
      id: v4(),
      member: { connect: { id: props.member.id } },
      community: { connect: { id: created.id } },
      created_at: new Date(),
      updated_at: new Date(),
    },
  } satisfies Prisma.reddit_platform_community_subscriptionsCreateArgs);
  // Transform and return
  return await RedditPlatformCommunityTransformer.transform(created);
}
