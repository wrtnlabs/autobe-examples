import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityMemberTransformer } from "../transformers/CommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberProfile(props: {
  member: MemberPayload;
}): Promise<ICommunityMember> {
  const member = await MyGlobal.prisma.community_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...CommunityMemberTransformer.select(),
  });
  return await CommunityMemberTransformer.transform(member);
}
