import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityMemberCommunitiesCommunityNameSubscription(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: community.id,
        },
      },
    });
  await MyGlobal.prisma.reddit_community_subscriptions.delete({
    where: {
      id: subscription.id,
    },
  });
}
