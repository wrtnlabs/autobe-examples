import { ICommunityPlatformCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityIcon";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityIconTransformer } from "../transformers/CommunityPlatformCommunityIconTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityIdIcon(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityIcon> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      ...CommunityPlatformCommunityIconTransformer.select(),
    });
  return await CommunityPlatformCommunityIconTransformer.transform(community);
}
