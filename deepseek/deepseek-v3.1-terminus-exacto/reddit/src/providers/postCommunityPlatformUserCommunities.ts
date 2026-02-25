import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityCollector } from "../collectors/CommunityPlatformCommunityCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommunities(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Validate community name uniqueness
  const existingCommunity =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingCommunity) {
    throw new HttpException("Community name already exists", 400);
  }
  // Validate icon_url if provided
  if (
    props.body.icon_url &&
    !typia.is<string & tags.Format<"uri">>(props.body.icon_url)
  ) {
    throw new HttpException("Invalid icon URL format", 400);
  }
  // Create the community using the collector
  const collectorData = await CommunityPlatformCommunityCollector.collect({
    body: props.body,
    owner: { id: props.user.id } as IEntity,
  });
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: collectorData,
    ...CommunityPlatformCommunityTransformer.select(),
  });
  return await CommunityPlatformCommunityTransformer.transform(created);
}
