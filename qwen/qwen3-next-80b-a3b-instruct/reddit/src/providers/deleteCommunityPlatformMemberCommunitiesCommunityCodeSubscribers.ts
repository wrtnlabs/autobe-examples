import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberCommunitiesCommunityCodeSubscribers(props: {
  member: MemberPayload;
  communityCode: string;
}): Promise<void> {
  // Delete subscription record (idempotent - no error if doesn't exist)
  await MyGlobal.prisma.community_platform_community_subscriptions.delete({
    where: {
      community_code: props.communityCode,
      member_id: props.member.id,
    },
  });
}
