import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IUpdate;
}): Promise<ICommunityPlatformMember> {
  const updated = await MyGlobal.prisma.community_platform_members.update({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      updated_at: new Date(),
    },
    ...CommunityPlatformMemberTransformer.select(),
  });
  return await CommunityPlatformMemberTransformer.transform(updated);
}
