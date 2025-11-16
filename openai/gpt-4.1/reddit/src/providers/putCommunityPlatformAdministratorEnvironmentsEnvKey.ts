import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorEnvironmentsEnvKey(props: {
  administrator: AdministratorPayload;
  envKey: string;
  body: ICommunityPlatformEnvironment.IUpdate;
}): Promise<ICommunityPlatformEnvironment> {
  // Step 1: Find the environment by env_key
  const existing =
    await MyGlobal.prisma.community_platform_environments.findUnique({
      where: { env_key: props.envKey },
    });

  if (!existing) {
    throw new HttpException("Environment not found", 404);
  }

  // Step 2: Prepare fields to update (only what is supplied)
  const updateFields: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.display_name !== undefined)
    updateFields.display_name = props.body.display_name;
  if (props.body.description !== undefined)
    updateFields.description = props.body.description;
  if (props.body.deleted_at !== undefined)
    updateFields.deleted_at = props.body.deleted_at;

  // Step 3: Perform the update
  const updated = await MyGlobal.prisma.community_platform_environments.update({
    where: { env_key: props.envKey },
    data: updateFields,
  });

  // Step 4: Return the updated result in API DTO format
  return {
    id: updated.id,
    env_key: updated.env_key,
    display_name: updated.display_name,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
