import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMember> {
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: props.memberId },
    ...CommunityPlatformMemberTransformer.select(),
  });
  if (!member) throw new HttpException("Member not found", 404);
  return await CommunityPlatformMemberTransformer.transform(member);
}
