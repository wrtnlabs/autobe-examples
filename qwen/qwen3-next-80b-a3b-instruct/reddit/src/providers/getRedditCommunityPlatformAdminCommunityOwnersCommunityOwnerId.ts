import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommunityOwnerTransformer } from "../transformers/RedditCommunityCommunityOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPlatformAdminCommunityOwnersCommunityOwnerId(props: {
  platformAdmin: PlatformadminPayload;
  communityOwnerId: string;
}): Promise<IRedditCommunityCommunityOwner> {
  const owner =
    await MyGlobal.prisma.reddit_community_community_owners.findUniqueOrThrow({
      where: {
        id: props.communityOwnerId,
        is_deleted: false,
      },
      ...RedditCommunityCommunityOwnerTransformer.select(),
    });
  return RedditCommunityCommunityOwnerTransformer.transform(owner);
}
