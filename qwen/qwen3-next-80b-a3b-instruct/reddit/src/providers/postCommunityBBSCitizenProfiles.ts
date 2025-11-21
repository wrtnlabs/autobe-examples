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

export async function postCommunityBBSCitizenProfiles(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSProfile.ICreate;
}): Promise<ICommunityBBSProfile> {
  // Validate citizen exists and is active
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findUnique({
    where: {
      id: props.citizen.id,
    },
  });

  if (!citizen) {
    throw new HttpException("Citizen not found or deactivated", 404);
  }

  // Check for unique display_name
  const existingProfile =
    await MyGlobal.prisma.community_bbs_profiles.findFirst({
      where: {
        display_name: (props.body as any).display_name,
      },
    });

  if (existingProfile) {
    throw new HttpException("Display name already exists", 409);
  }

  // Create profile with inline parameters
  const profile = await MyGlobal.prisma.community_bbs_profiles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      citizen_id: props.citizen.id,
      display_name: (props.body as any).display_name,
      bio: (props.body as any).bio,
      avatar_url: (props.body as any).avatar_url,
      location: (props.body as any).location,
      website: (props.body as any).website,
      custom_theme: (props.body as any).custom_theme,
      default_sort_order: (props.body as any).default_sort_order,
      notification_email_enabled: (props.body as any)
        .notification_email_enabled,
      notification_in_app_enabled: (props.body as any)
        .notification_in_app_enabled,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return formatted profile with proper null/undefined handling
  return {
    id: profile.id,
    citizen_id: profile.citizen_id,
    display_name: profile.display_name,
    bio:
      profile.bio === null
        ? undefined
        : (profile.bio satisfies string as string),
    avatar_url:
      profile.avatar_url === null
        ? undefined
        : (profile.avatar_url satisfies string as string),
    location:
      profile.location === null
        ? undefined
        : (profile.location satisfies string as string),
    website:
      profile.website === null
        ? undefined
        : (profile.website satisfies string as string),
    custom_theme:
      profile.custom_theme === null
        ? undefined
        : (profile.custom_theme satisfies string as string),
    default_sort_order:
      profile.default_sort_order === null
        ? undefined
        : (profile.default_sort_order satisfies string as string),
    notification_email_enabled:
      profile.notification_email_enabled === null
        ? undefined
        : (profile.notification_email_enabled satisfies boolean as boolean),
    notification_in_app_enabled:
      profile.notification_in_app_enabled === null
        ? undefined
        : (profile.notification_in_app_enabled satisfies boolean as boolean),
    created_at: toISOStringSafe(profile.created_at) satisfies string &
      tags.Format<"date-time"> as string &
      tags.Format<"date-time"> &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-schema": "community_bbs_profiles";
      }>,
    updated_at: toISOStringSafe(profile.updated_at) satisfies string &
      tags.Format<"date-time"> as string &
      tags.Format<"date-time"> &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-schema": "community_bbs_profiles";
      }>,
    is_deleted: false,
  };
}
