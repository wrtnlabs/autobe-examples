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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityCommunityActorTransformer } from "../transformers/CommunityCommunityActorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminCommunities(props: {
  admin: AdminPayload;
  body: ICommunityCommunity.ICreate;
}): Promise<ICommunityCommunity> {
  const created = await MyGlobal.prisma.community_communities.create({
    data: await CommunityCommunityCollector.collect({
      body: props.body,
      owner: props.admin,
    }),
    ...CommunityCommunityActorTransformer.select(),
  });
  return await CommunityCommunityActorTransformer.transform(created);
}
