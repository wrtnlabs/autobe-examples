import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityCollector } from "../collectors/CommunityPlatformCommunityCollector";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Authenticated actor is expected to be injected by the runtime.
  // We keep this access minimal and type-safe.
  const actor = (
    props as unknown as {
      customer: IEntity;
    }
  ).customer;
  if (!actor) {
    throw new HttpException("Unauthorized", 401);
  }
  try {
    const created = await MyGlobal.prisma.community_platform_communities.create(
      {
        data: await CommunityPlatformCommunityCollector.collect({
          body: props.body,
          owner: actor,
        }),
        ...CommunityPlatformCommunityTransformer.select(),
      },
    );
    return await CommunityPlatformCommunityTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("community name already exists", 409);
    }
    throw error;
  }
}
