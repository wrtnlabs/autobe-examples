import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentSubscriptionAtSubscriptionResponseTransformer } from "../transformers/RedditCloneContentSubscriptionAtSubscriptionResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityIdSubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneContentSubscription.ISubscribeRequest;
}): Promise<IRedditCloneContentSubscription.ISubscriptionResponse> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.findUnique({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: props.communityId,
        },
      },
    });
  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 400);
  }
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  const subscription =
    await MyGlobal.prisma.reddit_clone_content_subscriptions.create({
      data: {
        id,
        member_id: props.member.id,
        community_id: props.communityId,
        created_at: now,
        updated_at: now,
      },
      select: {
        community: {
          select: {
            id: true,
            name: true,
            icon_url: true,
          },
        },
      },
    });
  return await RedditCloneContentSubscriptionAtSubscriptionResponseTransformer.transform(
    {
      community: subscription.community,
    },
  );
}
