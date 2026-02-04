import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityCollector } from "../collectors/CommunityPlatformCommunityCollector";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";

export async function postCommunityPlatformModeratorCommunities(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: await CommunityPlatformCommunityCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.moderator.id },
      communityPlatformMemberSessions: { id: props.moderator.session_id },
    }),
    ...CommunityPlatformCommunityTransformer.select(),
  });
  return await CommunityPlatformCommunityTransformer.transform(created);
}
