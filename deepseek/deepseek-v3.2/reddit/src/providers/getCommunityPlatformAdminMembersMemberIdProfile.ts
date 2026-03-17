import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminMembersMemberIdProfile(props: {
  admin: AdminPayload;
  memberId: string;
}): Promise<ICommunityPlatformMember> {
  // Validate memberId format
  typia.assert<tags.Format<"uuid">>(props.memberId);
  // Retrieve member with transformer select
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: {
        id: props.memberId as string & tags.Format<"uuid">,
        deleted_at: null,
      },
      ...CommunityPlatformMemberTransformer.select(),
    });
  // Transform and return
  return await CommunityPlatformMemberTransformer.transform(member);
}
