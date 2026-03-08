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
  const member =
    await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
      where: {
        id: props.memberId,
        deleted_at: null,
      },
      ...CommunityPlatformMemberTransformer.select(),
    });
  return await CommunityPlatformMemberTransformer.transform(member);
}
