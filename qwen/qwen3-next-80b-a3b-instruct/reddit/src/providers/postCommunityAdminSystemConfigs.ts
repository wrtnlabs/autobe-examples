import { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitySystemConfigCollector } from "../collectors/CommunitySystemConfigCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ICommunitySystemConfig.ICreate;
}): Promise<ICommunitySystemConfig> {
  try {
    const created = await MyGlobal.prisma.community_system_configs.create({
      data: await CommunitySystemConfigCollector.collect({
        body: props.body,
      }),
      select: {
        id: true,
        name: true,
        value: true,
        type: true,
        enabled: true,
        created_at: true,
        updated_at: true,
      },
    });
    return {
      id: created.id,
      name: created.name,
      value: created.value,
      type: created.type,
      enabled: created.enabled,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Configuration with this name already exists",
        409,
      );
    }
    throw error;
  }
}
