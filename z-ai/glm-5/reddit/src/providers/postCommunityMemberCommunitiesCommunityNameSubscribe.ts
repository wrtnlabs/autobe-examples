import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunitySubscriptionTransformer } from "../transformers/CommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityNameSubscribe(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<ICommunitySubscription> {
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const existingSubscription =
    await MyGlobal.prisma.community_subscriptions.findUnique({
      where: {
        community_member_id_community_community_id: {
          community_member_id: props.member.id,
          community_community_id: community.id,
        },
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  const subscription = await MyGlobal.prisma.community_subscriptions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: { connect: { id: props.member.id } },
      community: { connect: { id: community.id } },
      created_at: new Date(),
    },
    ...CommunitySubscriptionTransformer.select(),
  });
  await MyGlobal.prisma.community_communities.update({
    where: { id: community.id },
    data: { subscriber_count: { increment: 1 } },
  });
  return await CommunitySubscriptionTransformer.transform(subscription);
}
