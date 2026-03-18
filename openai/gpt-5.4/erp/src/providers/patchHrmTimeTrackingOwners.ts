import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwners(props: {
  body: IHrmTimeTrackingOrganization.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganization.ISummary> {
  const authorizationCandidate: unknown = Reflect.get(
    globalThis,
    "authorization",
  );
  const headerBagCandidate: unknown = Reflect.get(
    globalThis,
    "__nestia_headers__",
  );
  const authorization: string | undefined =
    typeof authorizationCandidate === "string"
      ? authorizationCandidate
      : typeof headerBagCandidate === "object" &&
          headerBagCandidate !== null &&
          typeof Reflect.get(headerBagCandidate, "authorization") === "string"
        ? (() => {
            const value: unknown = Reflect.get(
              headerBagCandidate,
              "authorization",
            );
            return typeof value === "string" ? value : undefined;
          })()
        : undefined;
  if (
    authorization === undefined ||
    authorization.startsWith("Bearer ") === false
  ) {
    throw new HttpException("Unauthorized", 401);
  }
  const payload: unknown = jwt.verify(
    authorization.slice("Bearer ".length),
    MyGlobal.env.JWT_SECRET_KEY,
  );
  if (typeof payload !== "object" || payload === null) {
    throw new HttpException("Forbidden", 403);
  }
  const payloadType: unknown = Reflect.get(payload, "type");
  const payloadId: unknown = Reflect.get(payload, "id");
  if (payloadType !== "owner" || typeof payloadId !== "string") {
    throw new HttpException("Forbidden", 403);
  }
  const owner =
    await MyGlobal.prisma.hrm_time_tracking_owners.findUniqueOrThrow({
      where: {
        id: payloadId,
      },
      select: {
        id: true,
        deactivated_at: true,
        deleted_at: true,
      },
    });
  if (owner.deactivated_at !== null || owner.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.name !== undefined && props.body.name.length !== 0
      ? {
          name: {
            contains: props.body.name,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.description !== undefined &&
    props.body.description.length !== 0
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.currency_code !== undefined
      ? {
          currency_code: props.body.currency_code,
        }
      : {}),
    ...(props.body.timezone !== undefined
      ? {
          timezone: props.body.timezone,
        }
      : {}),
    ...(props.body.fiscal_start_month !== undefined
      ? {
          fiscal_start_month: props.body.fiscal_start_month,
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_organizationsWhereInput;
  const orderByInput: Prisma.hrm_time_tracking_organizationsOrderByWithRelationInput[] =
    props.body.sort === "name_asc"
      ? [{ name: "asc" }, { id: "asc" }]
      : props.body.sort === "name_desc"
        ? [{ name: "desc" }, { id: "asc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }, { id: "asc" }]
          : props.body.sort === "created_at_desc"
            ? [{ created_at: "desc" }, { id: "asc" }]
            : props.body.sort === "updated_at_asc"
              ? [{ updated_at: "asc" }, { id: "asc" }]
              : [{ updated_at: "desc" }, { id: "asc" }];
  const rows = await MyGlobal.prisma.hrm_time_tracking_organizations.findMany({
    where: {
      ...whereInput,
      id: {
        in: [],
      },
    },
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      logo_uri: true,
      currency_code: true,
      timezone: true,
      fiscal_start_month: true,
      created_at: true,
      updated_at: true,
    },
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_organizations.count({
    where: {
      ...whereInput,
      id: {
        in: [],
      },
    },
  });
  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      logo_uri: row.logo_uri,
      currency_code: row.currency_code,
      timezone: row.timezone,
      fiscal_start_month: row.fiscal_start_month,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
