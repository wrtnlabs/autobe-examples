import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostTextContentCollector } from "../collectors/RedditClonePostTextContentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTextContentTransformer } from "../transformers/RedditClonePostTextContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditClonePostTextContent.ICreate;
}): Promise<IRedditClonePostTextContent> {
  // 1. Validate community exists
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.body.community_id },
      select: { id: true },
    });
  // 2. Check if member is banned from community
  const existingBan =
    await MyGlobal.prisma.reddit_clone_community_bans.findUnique({
      where: {
        reddit_clone_community_id_reddit_clone_member_id: {
          reddit_clone_community_id: props.body.community_id,
          reddit_clone_member_id: props.member.id,
        },
      },
    });
  if (existingBan !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // 3. Check if already subscribed
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findUnique({
      where: {
        reddit_clone_member_id_reddit_clone_community_id: {
          reddit_clone_member_id: props.member.id,
          reddit_clone_community_id: props.body.community_id,
        },
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // 4. Create subscription using collector
  const subscriptionData = await RedditClonePostTextContentCollector.collect({
    body: props.body,
    member: { id: props.member.id },
    community: { id: community.id },
  });
  // 5. Create record in database
  const created = await MyGlobal.prisma.reddit_clone_subscriptions.create({
    data: subscriptionData,
    ...RedditClonePostTextContentTransformer.select(),
  });
  // 6. Return transformed result
  return await RedditClonePostTextContentTransformer.transform(created);
}
