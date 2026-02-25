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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  if (props.body.role !== "owner" && props.body.role !== "moderator") {
    throw new HttpException(
      "Invalid role; must be 'owner' or 'moderator'",
      400,
    );
  }
  const createData = await CommunityPlatformCommunityModeratorCollector.collect(
    {
      body: props.body,
      communityPlatformCommunities: { id: props.communityId },
    },
  );
  try {
    const created =
      await MyGlobal.prisma.community_platform_community_moderators.create({
        data: createData,
        ...CommunityPlatformCommunityModeratorTransformer.select(),
      });
    return await CommunityPlatformCommunityModeratorTransformer.transform(
      created,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        if (error.meta !== null && error.meta !== undefined) {
          if (
            Array.isArray(error.meta.target) &&
            error.meta.target.includes("role")
          ) {
            throw new HttpException(
              "There is already an owner assigned to this community.",
              409,
            );
          }
          if (
            Array.isArray(error.meta.target) &&
            error.meta.target.includes("community_moderator_id")
          ) {
            throw new HttpException(
              "This user is already assigned as a moderator in this community.",
              409,
            );
          }
        }
      }
    }
    throw error;
  }
}
