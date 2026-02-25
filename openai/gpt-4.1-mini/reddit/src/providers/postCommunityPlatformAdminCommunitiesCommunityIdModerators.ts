import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorCollector } from "../collectors/CommunityPlatformCommunityModeratorCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  if (props.body.role !== "owner" && props.body.role !== "moderator") {
    throw new HttpException("Invalid role value", 400);
  }
  const data = await CommunityPlatformCommunityModeratorCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
  });
  const created =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data,
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    created,
  );
}
