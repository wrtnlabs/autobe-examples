import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommunityCollector } from "../collectors/CommunityCommunityCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityCommunityActorTransformer } from "../transformers/CommunityCommunityActorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityModeratorCommunities(props: {
  moderator: ModeratorPayload;
  body: ICommunityCommunity.ICreate;
}): Promise<ICommunityCommunity> {
  const existing = await MyGlobal.prisma.community_communities.findFirst({
    where: { name: props.body.name },
  });
  if (existing) throw new HttpException("Community name already exists", 409);
  const created = await MyGlobal.prisma.community_communities.create({
    data: await CommunityCommunityCollector.collect({
      body: props.body,
      owner: props.moderator,
    }),
    ...CommunityCommunityActorTransformer.select(),
  });
  return await CommunityCommunityActorTransformer.transform(created);
}
