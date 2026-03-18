import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmsMemberEmailVerification.IRequest;
}): Promise<IPageIHrmsMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const whereConditions: Prisma.hrms_member_email_verificationsWhereInput = {
    deleted_at: null,
  };
  if (props.body.member_id !== undefined) {
    whereConditions.member_id = props.body.member_id;
  }
  if (props.body.created_at_from !== undefined) {
    if (props.body.created_at_to !== undefined) {
      whereConditions.created_at = {
        gte: new Date(props.body.created_at_from),
        lte: new Date(props.body.created_at_to),
      };
    } else {
      whereConditions.created_at = {
        gte: new Date(props.body.created_at_from),
      };
    }
  } else if (props.body.created_at_to !== undefined) {
    whereConditions.created_at = {
      lte: new Date(props.body.created_at_to),
    };
  }
  if (props.body.expires_at_from !== undefined) {
    if (props.body.expires_at_to !== undefined) {
      whereConditions.expires_at = {
        gte: new Date(props.body.expires_at_from),
        lte: new Date(props.body.expires_at_to),
      };
    } else {
      whereConditions.expires_at = {
        gte: new Date(props.body.expires_at_from),
      };
    }
  } else if (props.body.expires_at_to !== undefined) {
    whereConditions.expires_at = {
      lte: new Date(props.body.expires_at_to),
    };
  }
  if (props.body.status !== undefined) {
    const now = new Date();
    switch (props.body.status) {
      case "active":
        whereConditions.deleted_at = null;
        whereConditions.used_at = null;
        whereConditions.expires_at = { gt: now };
        break;
      case "used":
        whereConditions.OR = [
          { deleted_at: { not: null } },
          { used_at: { not: null } },
        ];
        break;
      case "expired":
        whereConditions.OR = [
          { expires_at: { lte: now } },
          { deleted_at: { not: null } },
        ];
        break;
    }
  }
  const orderByInput = {
    [sort_by]: sort_order,
  } satisfies Prisma.hrms_member_email_verificationsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrms_member_email_verifications.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      member: {
        select: {
          email: true,
          display_name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrms_member_email_verifications.count({
    where: whereConditions,
  });
  const transformedData = data.map((record) => {
    const now = new Date();
    let status: "active" | "used" | "expired";
    if (record.used_at !== null) {
      status = "used";
    } else if (record.deleted_at !== null) {
      status = "used";
    } else if (record.expires_at <= now) {
      status = "expired";
    } else {
      status = "active";
    }
    return {
      id: record.id,
      expires_at: toISOStringSafe(record.expires_at),
      used_at: record.used_at !== null ? toISOStringSafe(record.used_at) : null,
      created_at: toISOStringSafe(record.created_at),
      member_email: record.member.email,
      member_display_name: record.member.display_name,
      status,
    } satisfies IHrmsMemberEmailVerification.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmsMemberEmailVerification.ISummary;
}
