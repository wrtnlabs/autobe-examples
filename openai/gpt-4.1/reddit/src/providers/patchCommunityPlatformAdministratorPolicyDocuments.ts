import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPolicyDocument";
import { IPageICommunityPlatformPolicyDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPolicyDocument";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorPolicyDocuments(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformPolicyDocument.IRequest;
}): Promise<IPageICommunityPlatformPolicyDocument.ISummary> {
  const {
    policy_type,
    version,
    effective_from,
    effective_to,
    description,
    page,
    limit,
    order_by,
    order_dir,
  } = props.body;

  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(policy_type !== undefined && policy_type !== null && { policy_type }),
    ...(version !== undefined && version !== null && { version }),
    ...(description !== undefined &&
      description !== null && {
        description: {
          contains: description,
          mode: "insensitive",
        },
      }),
    ...(effective_from !== undefined &&
      effective_from !== null && {
        effective_at: {
          gte: effective_from,
        },
      }),
    ...(effective_to !== undefined &&
      effective_to !== null && {
        effective_at: {
          ...(effective_from !== undefined && effective_from !== null
            ? { gte: effective_from }
            : {}),
          lte: effective_to,
        },
      }),
  };

  // Remove possible overlap in effective_at condition
  if (
    where.effective_at &&
    effective_from !== undefined &&
    effective_from !== null &&
    effective_to !== undefined &&
    effective_to !== null
  ) {
    where.effective_at = { gte: effective_from, lte: effective_to };
  }

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_policy_documents.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ [order_by]: order_dir }],
    }),
    MyGlobal.prisma.community_platform_policy_documents.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      policy_type: record.policy_type,
      version: record.version,
      effective_at:
        typeof record.effective_at === "string"
          ? record.effective_at
          : toISOStringSafe(record.effective_at),
      document_uri: record.document_uri,
      description:
        record.description === null
          ? null
          : record.description === undefined
            ? undefined
            : record.description,
    })),
  };
}
