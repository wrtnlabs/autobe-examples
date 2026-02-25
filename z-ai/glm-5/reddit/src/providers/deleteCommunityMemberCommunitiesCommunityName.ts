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

export async function deleteCommunityMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<void> {
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only community owner can delete the community",
      403,
    );
  }
  await MyGlobal.prisma.community_communities.update({
    where: { id: community.id },
    data: {
      deleted_at: new Date(),
    },
  });
}
