import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityCollector } from "../collectors/RedditCommunityCommunityCollector";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityOwnerCommunities(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  // Convert CommunityownerPayload to minimal entity for collector (only id needed for connect)
  const entity: IEntity = {
    id: props.communityOwner.id,
  };
  // Use collector to generate Prisma input with owner_id from authenticated actor
  const data = await RedditCommunityCommunityCollector.collect({
    body: props.body,
    redditCommunityCommunityOwners: entity,
  });
  try {
    // Use transformer's select to specify required fields including nested owner
    const created = await MyGlobal.prisma.reddit_community_communities.create({
      data,
      ...RedditCommunityCommunityTransformer.select(),
    });
    // Transform result using transformer
    return await RedditCommunityCommunityTransformer.transform(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation
        throw new HttpException("COMMUNITY_NAME_TAKEN", 409);
      }
    }
    throw error;
  }
}
