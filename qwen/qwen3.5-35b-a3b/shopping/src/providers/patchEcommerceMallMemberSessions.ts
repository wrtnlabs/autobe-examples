import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
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

export async function patchEcommerceMallMemberSessions(props: {
  member: MemberPayload;
  body: IEcommerceMallGuestSession.IRequest;
}): Promise<IPageIEcommerceMallGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.limit ?? props.body.page_size ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (
    props.body.limit !== undefined &&
    props.body.limit !== null &&
    (props.body.limit < 0 || props.body.limit > 100)
  ) {
    throw new HttpException("Limit must be between 0 and 100", 400);
  }
  if (
    props.body.page_size !== undefined &&
    (props.body.page_size < 1 || props.body.page_size > 100)
  ) {
    throw new HttpException("Page size must be between 1 and 100", 400);
  }
  if (
    props.body.actor_type !== undefined &&
    props.body.actor_type !== "member"
  ) {
    throw new HttpException(
      "Actor type must be 'member' for this endpoint",
      400,
    );
  }
  if (
    props.body.session_status !== undefined &&
    props.body.session_status !== "active" &&
    props.body.session_status !== "expiring" &&
    props.body.session_status !== "expired"
  ) {
    throw new HttpException("Invalid session_status filter", 400);
  }
  const sortOrder = props.body.sort_order ?? "desc";
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new HttpException("Invalid sort_order", 400);
  }
  const whereInput: Prisma.ecommerce_mall_member_sessionsWhereInput = {
    ecommerce_mall_member_id: props.member.id,
  };
  if (props.body.created_at !== undefined) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at.start !== undefined) {
      createdAtFilter.gte = new Date(props.body.created_at.start);
    }
    if (props.body.created_at.end !== undefined) {
      createdAtFilter.lte = new Date(props.body.created_at.end);
    }
    whereInput.created_at = createdAtFilter;
  }
  if (props.body.expired_at !== undefined) {
    const expiredAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.expired_at.start !== undefined) {
      expiredAtFilter.gte = new Date(props.body.expired_at.start);
    }
    if (props.body.expired_at.end !== undefined) {
      expiredAtFilter.lte = new Date(props.body.expired_at.end);
    }
    whereInput.expired_at = expiredAtFilter;
  }
  if (props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  const hasSessionStatusFilter = props.body.session_status !== undefined;
  const sessionStatusFilter = props.body.session_status;
  const orderByInput: Prisma.ecommerce_mall_member_sessionsOrderByWithRelationInput[] =
    props.body.sort_by === "expired_at"
      ? [{ expired_at: sortOrder }]
      : [{ created_at: sortOrder }];
  const sessions =
    await MyGlobal.prisma.ecommerce_mall_member_sessions.findMany({
      where: whereInput,
      include: {
        member: {
          select: {
            id: true,
            display_name: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: orderByInput,
    });
  const total = await MyGlobal.prisma.ecommerce_mall_member_sessions.count({
    where: whereInput,
  });
  const filteredSessions = hasSessionStatusFilter
    ? sessions.filter(
        (session) =>
          computeSessionStatusFromTimestamp(
            toISOStringSafe(session.expired_at),
          ) === sessionStatusFilter,
      )
    : sessions;
  const data: IEcommerceMallGuestSession.ISummary[] = filteredSessions.map(
    (session) => {
      return {
        id: session.id,
        actor_type: "member",
        actor_id: session.ecommerce_mall_member_id,
        ip: session.ip,
        href: session.href ?? "",
        created_at: toISOStringSafe(session.created_at),
        expired_at: toISOStringSafe(session.expired_at),
        session_status: computeSessionStatusFromTimestamp(
          toISOStringSafe(session.expired_at),
        ),
      } satisfies IEcommerceMallGuestSession.ISummary;
    },
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination,
    data,
  };
}
function computeSessionStatusFromTimestamp(
  expired_at: string & tags.Format<"date-time">,
): "active" | "expiring" | "expired" {
  const expiredDateTime = new Date(expired_at);
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  if (expiredDateTime <= now) {
    return "expired";
  } else if (expiredDateTime <= oneHourFromNow) {
    return "expiring";
  } else {
    return "active";
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
// import { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberSessions(props: {
//   member: MemberPayload;
//   body: IEcommerceMallGuestSession.IRequest;
// }): Promise<IPageIEcommerceMallGuestSession.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------