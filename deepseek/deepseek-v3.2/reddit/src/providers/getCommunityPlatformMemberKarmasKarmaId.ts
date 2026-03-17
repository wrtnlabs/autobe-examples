import { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
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
import { CommunityPlatformKarmaTransformer } from "../transformers/CommunityPlatformKarmaTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberKarmasKarmaId(props: {
  member: MemberPayload;
  karmaId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarma> {
  // Verify karma exists and belongs to authenticated member
  const karma =
    await MyGlobal.prisma.community_platform_karmas.findUniqueOrThrow({
      where: {
        id: props.karmaId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
      },
    });
  // Authorization check: member can only view their own karma
  if (karma.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch complete karma with transformer
  const result =
    await MyGlobal.prisma.community_platform_karmas.findUniqueOrThrow({
      where: { id: props.karmaId },
      ...CommunityPlatformKarmaTransformer.select(),
    });
  return await CommunityPlatformKarmaTransformer.transform(result);
}
