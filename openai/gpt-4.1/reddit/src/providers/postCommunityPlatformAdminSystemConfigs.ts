import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemConfig.ICreate;
}): Promise<ICommunityPlatformSystemConfig> {
  try {
    const now = toISOStringSafe(new Date());
    const created =
      await MyGlobal.prisma.community_platform_system_configs.create({
        data: {
          id: v4(),
          key: props.body.key,
          value: props.body.value,
          description:
            props.body.description !== undefined
              ? props.body.description
              : null,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "A configuration entry with this key already exists.",
        409,
      );
    }
    throw new HttpException("Failed to create system config.", 500);
  }
}
