import { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBanReasonCollector } from "../collectors/CommunityPlatformBanReasonCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBanReasonTransformer } from "../transformers/CommunityPlatformBanReasonTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminBanReasons(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBanReason.ICreate;
}): Promise<ICommunityPlatformBanReason> {
  // Check for duplicate code (case-sensitive)
  const existingCode =
    await MyGlobal.prisma.community_platform_ban_reasons.findFirst({
      where: {
        code: props.body.code,
        deleted_at: null,
      },
    });
  if (existingCode) {
    throw new HttpException(
      `Ban reason code '${props.body.code}' already exists`,
      409,
    );
  }
  // Check for duplicate title (case-insensitive)
  const existingTitle =
    await MyGlobal.prisma.community_platform_ban_reasons.findFirst({
      where: {
        title: {
          equals: props.body.title,
          mode: "insensitive",
        },
        deleted_at: null,
      },
    });
  if (existingTitle) {
    throw new HttpException(
      `Ban reason title '${props.body.title}' already exists`,
      409,
    );
  }
  // Use collector to transform DTO to database input with all fields
  const data = await CommunityPlatformBanReasonCollector.collect({
    body: props.body,
  });
  // Create the ban reason with all collected data
  const created = await MyGlobal.prisma.community_platform_ban_reasons.create({
    data: {
      ...data,
      // Include all required fields explicitly to satisfy TypeScript
      code: props.body.code,
      title: props.body.title,
      description: props.body.description,
      severity: props.body.severity,
      active: props.body.active ?? true, // Provide default value
      // Ensure timestamps are set
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...CommunityPlatformBanReasonTransformer.select(),
  });
  // Transform database result to response DTO
  return await CommunityPlatformBanReasonTransformer.transform(created);
}
