import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMembersMemberId(props: {
  memberId: string;
}): Promise<ICommunityMember> {
  const member = await MyGlobal.prisma.community_members.findFirstOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name ?? null,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url ?? null,
    karma: member.karma,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
  };
}
