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

export async function getCommunityBBSProfilesProfileId(props: {
  citizen: CitizenPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityBBSProfile> {
  const profile = await MyGlobal.prisma.community_bbs_profiles.findUnique({
    where: { id: props.profileId },
  });

  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }

  // Check if requester is owner
  const isOwner = profile.citizen_id === props.citizen.id;

  // Map to ICommunityBBSProfile with correct null/undefined handling
  const result: ICommunityBBSProfile = {
    id: profile.id,
    citizen_id: profile.citizen_id,
    display_name: profile.display_name,
    bio: profile.bio === null ? undefined : profile.bio,
    avatar_url: profile.avatar_url === null ? undefined : profile.avatar_url,
    location: profile.location === null ? undefined : profile.location,
    website: profile.website === null ? undefined : profile.website,
    custom_theme:
      profile.custom_theme === null ? undefined : profile.custom_theme,
    default_sort_order: profile.default_sort_order, // Required in schema, no null/undefined
    notification_email_enabled: profile.notification_email_enabled,
    notification_in_app_enabled: profile.notification_in_app_enabled,
    created_at: toISOStringSafe(profile.created_at) satisfies string as string,
    updated_at: toISOStringSafe(profile.updated_at) satisfies string as string,
    is_deleted: false,
  };

  // If not owner, mask non-public fields
  if (!isOwner) {
    return {
      id: result.id,
      citizen_id: result.citizen_id,
      display_name: result.display_name,
      bio: result.bio,
      avatar_url: result.avatar_url,
      location: result.location,
      website: result.website,
      custom_theme: undefined, // masked
      default_sort_order: undefined, // masked
      notification_email_enabled: undefined, // masked
      notification_in_app_enabled: undefined, // masked
      created_at: result.created_at,
      updated_at: result.updated_at,
      is_deleted: false,
    };
  }

  return result;
}
