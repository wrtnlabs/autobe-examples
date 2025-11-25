import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunitySystemConfigurations(props: {
  admin: AdminPayload;
  body: IRedditCommunitySystemConfiguration.ICreate;
}): Promise<IRedditCommunitySystemConfiguration> {
  try {
    const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
    const created =
      await MyGlobal.prisma.reddit_community_system_configurations.create({
        data: {
          id: v4(),
          name: props.body.name,
          value: props.body.value,
          description: props.body.description ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

    return {
      id: created.id,
      name: created.name,
      value: created.value,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null && created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" // Unique constraint failed
    ) {
      throw new HttpException("Configuration name must be unique", 400);
    }
    throw error;
  }
}
