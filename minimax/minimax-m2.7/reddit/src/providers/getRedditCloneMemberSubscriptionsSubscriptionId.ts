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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityBanAtSummaryTransformer } from "../transformers/RedditCloneCommunityBanAtSummaryTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePostTextContent> {
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findUniqueOrThrow({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_community_id: true,
        created_at: true,
        member: RedditCloneMemberSessionAtSummaryTransformer.select(),
        community: RedditCloneCommunityBanAtSummaryTransformer.select(),
      },
    });
  if (subscription.reddit_clone_member_id !== props.member.id) {
    const isModeratorOrOwner =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_community_id: subscription.reddit_clone_community_id,
          reddit_clone_member_id: props.member.id,
        },
      });
    if (!isModeratorOrOwner) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return {
    id: subscription.id,
    created_at: subscription.created_at.toISOString(),
    member: await RedditCloneMemberSessionAtSummaryTransformer.transform(
      subscription.member,
    ),
    community: await RedditCloneCommunityBanAtSummaryTransformer.transform(
      subscription.community,
    ),
  };
}
