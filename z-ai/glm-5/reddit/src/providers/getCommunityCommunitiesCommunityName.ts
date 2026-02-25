import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommunityTransformer } from "../transformers/CommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityCommunitiesCommunityName(props: {
  communityName: string;
}): Promise<ICommunityCommunity> {
  const community =
    await MyGlobal.prisma.community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      ...CommunityCommunityTransformer.select(),
    });
  return await CommunityCommunityTransformer.transform(community);
}
