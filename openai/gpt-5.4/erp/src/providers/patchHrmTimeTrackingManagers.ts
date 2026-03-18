import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingManager";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingManagerAtSummaryTransformer } from "../transformers/HrmTimeTrackingManagerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingManagers(props: {
  body: IHrmTimeTrackingManager.IRequest;
}): Promise<IPageIHrmTimeTrackingManager.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const sortText: string = props.body.sort ?? "created_at:desc";
  const sortTokens: string[] = sortText.split(":");
  if (sortTokens.length !== 2) {
    throw new HttpException("Invalid sort format", 400);
  }
  const fieldToken: "email" | "created_at" | "updated_at" | "deleted_at" =
    sortTokens[0] === "email" ||
    sortTokens[0] === "created_at" ||
    sortTokens[0] === "updated_at" ||
    sortTokens[0] === "deleted_at"
      ? sortTokens[0]
      : (() => {
          throw new HttpException("Invalid sort field", 400);
        })();
  const directionToken: "asc" | "desc" =
    sortTokens[1] === "asc" || sortTokens[1] === "desc"
      ? sortTokens[1]
      : (() => {
          throw new HttpException("Invalid sort direction", 400);
        })();
  const andConditions: Prisma.hrm_time_tracking_managersWhereInput[] = [];
  if (props.body.email !== undefined) {
    andConditions.push({
      email: { equals: props.body.email },
    });
  }
  if (props.body.search !== undefined) {
    andConditions.push({
      email: {
        contains: props.body.search,
        mode: Prisma.QueryMode.insensitive,
      },
    });
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    andConditions.push({
      created_at: {
        ...(props.body.created_at_from !== undefined
          ? { gte: new Date(props.body.created_at_from) }
          : {}),
        ...(props.body.created_at_to !== undefined
          ? { lte: new Date(props.body.created_at_to) }
          : {}),
      },
    });
  }
  if (
    props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
  ) {
    andConditions.push({
      updated_at: {
        ...(props.body.updated_at_from !== undefined
          ? { gte: new Date(props.body.updated_at_from) }
          : {}),
        ...(props.body.updated_at_to !== undefined
          ? { lte: new Date(props.body.updated_at_to) }
          : {}),
      },
    });
  }
  if (
    props.body.deleted_at_from !== undefined ||
    props.body.deleted_at_to !== undefined
  ) {
    andConditions.push({
      deleted_at: {
        not: null,
        ...(props.body.deleted_at_from !== undefined
          ? { gte: new Date(props.body.deleted_at_from) }
          : {}),
        ...(props.body.deleted_at_to !== undefined
          ? { lte: new Date(props.body.deleted_at_to) }
          : {}),
      },
    });
  }
  if (props.body.isDeleted === true) {
    andConditions.push({ deleted_at: { not: null } });
  }
  if (props.body.isDeleted === false) {
    andConditions.push({ deleted_at: null });
  }
  const whereInput: Prisma.hrm_time_tracking_managersWhereInput = {
    AND: andConditions,
  };
  const orderByInput: Prisma.hrm_time_tracking_managersOrderByWithRelationInput[] =
    [
      fieldToken === "email"
        ? { email: directionToken }
        : fieldToken === "created_at"
          ? { created_at: directionToken }
          : fieldToken === "updated_at"
            ? { updated_at: directionToken }
            : { deleted_at: directionToken },
      { id: "desc" },
    ];
  const data = await MyGlobal.prisma.hrm_time_tracking_managers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingManagerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_managers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingManagerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
