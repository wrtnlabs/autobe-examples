import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSearch";
import { IETodoAppActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppActorType";
import { IETodoAppActorSearchOrderBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppActorSearchOrderBy";
import { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import { IPageITodoAppActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActorSearch";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserActorsSearch(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppActorSearch.IRequest;
}): Promise<IPageITodoAppActorSearch.ISummary> {
  const body = props.body;

  const page = body.page;
  const rawLimit = body.limit;
  const maxLimit = 100;
  const limit = rawLimit > maxLimit ? maxLimit : rawLimit;

  const orderBy = body.orderBy ?? "createdAt";
  const orderDirection = body.orderDirection ?? "desc";

  const actorTypes: IETodoAppActorType[] =
    body.actorTypes !== undefined && body.actorTypes.length > 0
      ? body.actorTypes
      : ["guestUser", "memberUser", "adminUser"];

  const takeForMerge = page * limit;

  const createdFrom = body.createdFrom;
  const createdTo = body.createdTo;
  const emailFilter = body.email;
  const displayNameFilter = body.displayName;
  const statusFilter = body.status;

  const createdAtCondition = (() => {
    if (createdFrom === undefined && createdTo === undefined) return undefined;

    const range: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};

    if (createdFrom !== undefined && createdFrom !== null) {
      range.gte = createdFrom;
    }
    if (createdTo !== undefined && createdTo !== null) {
      range.lte = createdTo;
    }

    if (range.gte === undefined && range.lte === undefined) return undefined;
    return range;
  })();

  const guestPromise = actorTypes.includes("guestUser")
    ? Promise.all([
        MyGlobal.prisma.todo_app_guestusers.findMany({
          where: {
            deleted_at: null,
            ...(displayNameFilter !== undefined && {
              display_name: displayNameFilter,
            }),
            ...(createdAtCondition !== undefined && {
              created_at: createdAtCondition,
            }),
          },
          orderBy:
            orderBy === "displayName"
              ? { display_name: orderDirection }
              : { created_at: orderDirection },
          skip: 0,
          take: takeForMerge,
        }),
        MyGlobal.prisma.todo_app_guestusers.count({
          where: {
            deleted_at: null,
            ...(displayNameFilter !== undefined && {
              display_name: displayNameFilter,
            }),
            ...(createdAtCondition !== undefined && {
              created_at: createdAtCondition,
            }),
          },
        }),
      ])
    : Promise.all([Promise.resolve([]), Promise.resolve(0)]);

  const memberPromise = actorTypes.includes("memberUser")
    ? Promise.all([
        MyGlobal.prisma.todo_app_memberusers.findMany({
          where: {
            deleted_at: null,
            ...(emailFilter !== undefined && {
              email: emailFilter,
            }),
            ...(displayNameFilter !== undefined && {
              display_name: displayNameFilter,
            }),
            ...(statusFilter !== undefined && {
              status: statusFilter,
            }),
            ...(createdAtCondition !== undefined && {
              created_at: createdAtCondition,
            }),
          },
          orderBy:
            orderBy === "displayName"
              ? { display_name: orderDirection }
              : { created_at: orderDirection },
          skip: 0,
          take: takeForMerge,
        }),
        MyGlobal.prisma.todo_app_memberusers.count({
          where: {
            deleted_at: null,
            ...(emailFilter !== undefined && {
              email: emailFilter,
            }),
            ...(displayNameFilter !== undefined && {
              display_name: displayNameFilter,
            }),
            ...(statusFilter !== undefined && {
              status: statusFilter,
            }),
            ...(createdAtCondition !== undefined && {
              created_at: createdAtCondition,
            }),
          },
        }),
      ])
    : Promise.all([Promise.resolve([]), Promise.resolve(0)]);

  const adminPromise = actorTypes.includes("adminUser")
    ? Promise.all([
        MyGlobal.prisma.todo_app_adminusers.findMany({
          where: {
            deleted_at: null,
            ...(emailFilter !== undefined && {
              email: emailFilter,
            }),
            ...(displayNameFilter !== undefined && {
              display_name: displayNameFilter,
            }),
            ...(statusFilter !== undefined && {
              status: statusFilter,
            }),
            ...(createdAtCondition !== undefined && {
              created_at: createdAtCondition,
            }),
          },
          orderBy:
            orderBy === "displayName"
              ? { display_name: orderDirection }
              : { created_at: orderDirection },
          skip: 0,
          take: takeForMerge,
        }),
        MyGlobal.prisma.todo_app_adminusers.count({
          where: {
            deleted_at: null,
            ...(emailFilter !== undefined && {
              email: emailFilter,
            }),
            ...(displayNameFilter !== undefined && {
              display_name: displayNameFilter,
            }),
            ...(statusFilter !== undefined && {
              status: statusFilter,
            }),
            ...(createdAtCondition !== undefined && {
              created_at: createdAtCondition,
            }),
          },
        }),
      ])
    : Promise.all([Promise.resolve([]), Promise.resolve(0)]);

  const [guestResult, memberResult, adminResult] = await Promise.all([
    guestPromise,
    memberPromise,
    adminPromise,
  ]);

  const guestRows = guestResult[0];
  const guestCount = guestResult[1];

  const memberRows = memberResult[0];
  const memberCount = memberResult[1];

  const adminRows = adminResult[0];
  const adminCount = adminResult[1];

  type EnrichedSummary = {
    summary: ITodoAppActorSearch.ISummary;
    sortCreatedAt: string;
    sortDisplayName: string;
  };

  const enriched: EnrichedSummary[] = [];

  for (const row of guestRows) {
    const summary: ITodoAppActorSearch.ISummary = {
      actorType: "guestUser",
      id: row.id,
    };

    if (row.display_name !== null) {
      summary.display_name = row.display_name;
    }

    const sortCreatedAt = toISOStringSafe(row.created_at);
    const sortDisplayName =
      summary.display_name !== undefined ? summary.display_name : "";

    enriched.push({ summary, sortCreatedAt, sortDisplayName });
  }

  for (const row of memberRows) {
    const summary: ITodoAppActorSearch.ISummary = {
      actorType: "memberUser",
      id: row.id,
      email: row.email,
      status: row.status,
    };

    if (row.display_name !== null) {
      summary.display_name = row.display_name;
    }

    if (row.last_login_at !== null) {
      summary.last_login_at = toISOStringSafe(row.last_login_at);
    } else {
      summary.last_login_at = null;
    }

    const sortCreatedAt = toISOStringSafe(row.created_at);
    const sortDisplayName =
      summary.display_name !== undefined ? summary.display_name : "";

    enriched.push({ summary, sortCreatedAt, sortDisplayName });
  }

  for (const row of adminRows) {
    const summary: ITodoAppActorSearch.ISummary = {
      actorType: "adminUser",
      id: row.id,
      email: row.email,
      status: row.status,
    };

    if (row.display_name !== null) {
      summary.display_name = row.display_name;
    }

    if (row.last_login_at !== null) {
      summary.last_login_at = toISOStringSafe(row.last_login_at);
    } else {
      summary.last_login_at = null;
    }

    const sortCreatedAt = toISOStringSafe(row.created_at);
    const sortDisplayName =
      summary.display_name !== undefined ? summary.display_name : "";

    enriched.push({ summary, sortCreatedAt, sortDisplayName });
  }

  const sorted = enriched.slice();

  sorted.sort((a, b) => {
    if (orderBy === "displayName") {
      if (a.sortDisplayName < b.sortDisplayName) {
        return orderDirection === "asc" ? -1 : 1;
      }
      if (a.sortDisplayName > b.sortDisplayName) {
        return orderDirection === "asc" ? 1 : -1;
      }
    } else {
      if (a.sortCreatedAt < b.sortCreatedAt) {
        return orderDirection === "asc" ? -1 : 1;
      }
      if (a.sortCreatedAt > b.sortCreatedAt) {
        return orderDirection === "asc" ? 1 : -1;
      }
    }

    if (a.summary.id < b.summary.id) {
      return orderDirection === "asc" ? -1 : 1;
    }
    if (a.summary.id > b.summary.id) {
      return orderDirection === "asc" ? 1 : -1;
    }

    return 0;
  });

  const start = (page - 1) * limit;
  const end = start + limit;
  const pageEnriched = sorted.slice(start, end);

  const data: ITodoAppActorSearch.ISummary[] = pageEnriched.map(
    (item) => item.summary,
  );

  const totalRecords = guestCount + memberCount + adminCount;
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: totalRecords,
    pages: totalPages,
  };

  return {
    pagination,
    data,
  };
}
