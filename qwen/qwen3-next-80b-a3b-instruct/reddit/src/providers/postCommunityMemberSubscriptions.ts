import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitySubscriptionCollector } from "../collectors/CommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunitySubscription.ICreate;
}): Promise<ICommunitySubscription> {
  // Use the existing collector to transform request into database input
  const created = await MyGlobal.prisma.community_subscriptions.create({
    data: await CommunitySubscriptionCollector.collect({
      body: props.body,
      community_member_id: props.member.id,
      community_community_id: props.body.community_community_id,
    }),
  });
  // Return the created subscription using direct mapping with proper date conversion
  return {
    id: created.id,
    community_member_id: created.community_member_id,
    community_community_id: created.community_community_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
