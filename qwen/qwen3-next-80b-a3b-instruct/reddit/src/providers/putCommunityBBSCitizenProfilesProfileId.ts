import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSProfile";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putCommunityBBSCitizenProfilesProfileId(props: {
  citizen: CitizenPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityBBSProfile.IUpdate;
}): Promise<ICommunityBBSProfile> {
  // Verify profile exists and belongs to the authenticated citizen
  const existingProfile =
    await MyGlobal.prisma.community_bbs_profiles.findUnique({
      where: {
        id: props.profileId,
        citizen_id: props.citizen.id,
      },
    });

  if (!existingProfile) {
    throw new HttpException("Profile not found or access denied", 404);
  }

  // Handle display_name uniqueness check
  if (props.body.display_name !== undefined) {
    const existingWithName =
      await MyGlobal.prisma.community_bbs_profiles.findFirst({
        where: {
          display_name: props.body.display_name,
          id: {
            not: props.profileId,
          },
        },
      });

    if (existingWithName) {
      throw new HttpException("Display name already in use", 409);
    }
  }

  // Build update data inline — pass fields as-is, let Prisma handle null/undefined
  const updatedProfile = await MyGlobal.prisma.community_bbs_profiles.update({
    where: {
      id: props.profileId,
    },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio,
      avatar_url: props.body.avatar_url,
      location: props.body.location,
      website: props.body.website,
      custom_theme: props.body.custom_theme,
      default_sort_order: props.body.default_sort_order,
      notification_email_enabled: props.body.notification_email_enabled,
      notification_in_app_enabled: props.body.notification_in_app_enabled,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return formatted profile with proper date-time strings
  return {
    id: updatedProfile.id,
    citizen_id: updatedProfile.citizen_id,
    display_name: updatedProfile.display_name,
    bio: updatedProfile.bio === null ? undefined : updatedProfile.bio,
    avatar_url:
      updatedProfile.avatar_url === null
        ? undefined
        : updatedProfile.avatar_url,
    location:
      updatedProfile.location === null ? undefined : updatedProfile.location,
    website:
      updatedProfile.website === null ? undefined : updatedProfile.website,
    custom_theme:
      updatedProfile.custom_theme === null
        ? undefined
        : updatedProfile.custom_theme,
    default_sort_order: updatedProfile.default_sort_order,
    notification_email_enabled: updatedProfile.notification_email_enabled,
    notification_in_app_enabled: updatedProfile.notification_in_app_enabled,
    created_at: toISOStringSafe(
      updatedProfile.created_at,
    ) satisfies string as string,
    updated_at: toISOStringSafe(
      updatedProfile.updated_at,
    ) satisfies string as string,
    is_deleted: false,
  };
}
