import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityFlairTransformer } from "../transformers/CommunityPlatformCommunityFlairTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdFlairsFlairId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  flairId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlair.IUpdate;
}): Promise<ICommunityPlatformCommunityFlair> {
  // Verify the flair exists and belongs to the specified community
  const existingFlair =
    await MyGlobal.prisma.community_platform_community_flairs.findUniqueOrThrow(
      {
        where: {
          id: props.flairId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
      },
    );
  // Validate display_text uniqueness if being updated
  if (
    props.body.display_text !== undefined &&
    props.body.display_text !== existingFlair.display_text
  ) {
    const existingFlairWithSameText =
      await MyGlobal.prisma.community_platform_community_flairs.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          display_text: props.body.display_text,
          deleted_at: null,
          id: { not: props.flairId },
        },
      });
    if (existingFlairWithSameText) {
      throw new HttpException(
        "Display text must be unique within the community",
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.community_platform_community_flairsUpdateInput = {
    ...(props.body.display_text !== undefined && {
      display_text: props.body.display_text,
    }),
    ...(props.body.background_color !== undefined && {
      background_color: props.body.background_color,
    }),
    ...(props.body.text_color !== undefined && {
      text_color: props.body.text_color,
    }),
    ...(props.body.css_class !== undefined && {
      css_class: props.body.css_class,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: new Date(),
  };
  // Update the flair
  const updatedFlair =
    await MyGlobal.prisma.community_platform_community_flairs.update({
      where: { id: props.flairId },
      data: updateData,
      ...CommunityPlatformCommunityFlairTransformer.select(),
    });
  // Transform and return the result
  return await CommunityPlatformCommunityFlairTransformer.transform(
    updatedFlair,
  );
}
